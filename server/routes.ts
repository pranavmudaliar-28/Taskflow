import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { insertProjectSchema, insertTaskSchema, insertCommentSchema, insertOrganizationInvitationSchema, insertMilestoneSchema, type Project } from "@shared/schema";
import { sendOrganizationInvitationEmail } from "./email";
import { apiLimiter, authLimiter, inviteLimiter } from "./middleware/rateLimiter";
import { sanitizeInput } from "./middleware/sanitize";
import crypto from "crypto";
import { seedDatabase } from "./seed";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registerStripeRoutes } from "./stripe";
import { generateSlug } from "./slug-utils";
import { UserMongo, ProjectMongo, ProjectMemberMongo } from "../shared/mongodb-schema";
import fs from "fs";
import path from "path";
import express from "express";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("[Routes] Starting route registration...");

  // ── Raw body parser for Stripe webhooks (MUST be before express.json) ──────
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

  // Setup authentication
  console.log("[Routes] Setting up auth...");
  await setupAuth(app);
  registerAuthRoutes(app);
  console.log("[Routes] Auth setup complete.");

  // ── Register real Stripe routes (AFTER auth setup so req.user works) ────────
  console.log("[Routes] Registering Stripe routes...");
  registerStripeRoutes(app);
  console.log("[Routes] Stripe routes registered.");

  // Helper to get user ID from request
  const getUserId = (req: any): string => {
    return req.user?.claims?.sub || req.user?.id;
  };

  // === Custom Auth Routes ===
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/api/auth/register", authLimiter, sanitizeInput, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await authStorage.upsertUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        onboardingStep: "plan", // Ensure they start at plan step
      });

      // Initialize workspace for the new user (now part of onboarding completion)
      // await storage.initializeUserWorkspace(user.id);

      // Process any pending invitations for this email
      try {
        const normalizedEmail = data.email.trim().toLowerCase();

        // 1. Process Organization Invitations
        const orgInvites = await storage.getPendingOrganizationInvitationsByEmail(normalizedEmail);
        for (const invite of orgInvites) {
          await storage.acceptOrganizationInvitation(invite.token, user.id);
          console.log(`[Register] Auto-accepted organization invitation for ${normalizedEmail} to org ${invite.organizationId}`);
        }

        // 2. Process Project Invitations
        const pendingInvites = await storage.getPendingInvitationsByEmail(normalizedEmail);
        for (const invite of pendingInvites) {
          const alreadyMember = await storage.isUserInOrganization(user.id, invite.organizationId);
          if (!alreadyMember) {
            await storage.addOrganizationMember({
              organizationId: invite.organizationId,
              userId: user.id,
              role: "member",
            });
          }
          await storage.addProjectMember({
            projectId: invite.projectId,
            userId: user.id,
            role: invite.role || "member",
          });
          await storage.createNotification({
            userId: user.id,
            type: "added_to_project",
            title: "Added to project",
            message: `You have been added to a project via invitation`,
            relatedProjectId: invite.projectId,
          });
          await storage.deleteProjectInvitation(invite.id);
        }
      } catch (inviteError) {
        console.error("Error processing pending invitations:", inviteError);
      }

      // Create session manually
      (req as any).login({ id: user.id, claims: { sub: user.id } }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Please check your input", errors: error.issues });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, sanitizeInput, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session manually
      (req as any).login({ id: user.id, claims: { sub: user.id } }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Please check your input", errors: error.issues });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ message: "Logged out" });
      });
    });
  });

  // === User Profile Routes ===
  const updateProfileSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
  });

  app.patch("/api/user/profile", isAuthenticated, apiLimiter, sanitizeInput, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = updateProfileSchema.parse(req.body);

      // If email is being changed, check if it's already in use
      if (data.email) {
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "This email is already in use" });
        }
      }

      const updatedUser = await storage.updateUser(userId, data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Invalid input", errors: error.issues });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });

  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = changePasswordSchema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Invalid input", errors: error.issues });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // === Dashboard ===
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Seed database with sample data for new users
      await seedDatabase(userId);

      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // === Stripe & Onboarding ===
  app.post("/api/onboarding/setup-organization", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { name, email, address, invitations } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Organization name is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Create the organization with new fields
      const org = await storage.createOrganization({
        name,
        email,
        address,
        ownerId: userId,
      });

      // Add user as admin
      await storage.addOrganizationMember({
        organizationId: org.id,
        userId: userId,
        role: "admin",
      });

      // Process invitations if provided
      if (invitations && Array.isArray(invitations)) {
        for (const invitedEmail of invitations) {
          if (!invitedEmail || typeof invitedEmail !== "string") continue;

          try {
            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            await storage.createOrganizationInvitation({
              organizationId: org.id,
              email: invitedEmail.trim().toLowerCase(),
              role: "member",
              invitedBy: userId,
              token,
              expiresAt,
            });

            // Send invitation email
            await sendOrganizationInvitationEmail({
              to: invitedEmail.trim().toLowerCase(),
              organizationName: org.name,
              inviterName: `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`,
              acceptUrl: `${req.protocol}://${req.get("host")}/accept-invitation?token=${token}`,
              expiresAt,
            });

            console.log(`[Onboarding] Invitation email sent to ${invitedEmail} for org ${org.name}`);
          } catch (inviteError) {
            console.error(`Failed to invite ${invitedEmail}:`, inviteError);
          }
        }
      }

      // Update onboarding step to completed
      await storage.updateUser(userId, { onboardingStep: "completed" });

      res.json(org);
    } catch (error) {
      console.error("Onboarding org setup error:", error);
      res.status(500).json({ message: "Failed to setup organization" });
    }
  });

  app.post("/api/onboarding/complete", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.updateUser(userId, { onboardingStep: "completed" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // === Organizations ===
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      let organizations = await storage.getOrganizationsByUser(userId);

      if (organizations.length === 0) {
        // Lazy initialize workspace if it doesn't exist
        await storage.initializeUserWorkspace(userId);
        organizations = await storage.getOrganizationsByUser(userId);
      }

      // Enhance organizations with user's role
      const orgIds = organizations.map(o => o.id);
      const members = await storage.getOrganizationMembersForUser(userId, orgIds);

      const enhancedOrgs = organizations.map(org => {
        const member = members.find(m => m.organizationId === org.id);
        return {
          ...org,
          role: member?.role || "member"
        };
      });

      res.json(enhancedOrgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;

      // Verify user belongs to this org
      const userOrgs = await storage.getOrganizationsByUser(userId);
      if (!userOrgs.some(o => o.id === orgId)) {
        return res.status(403).json({ message: "Access denied to organization" });
      }

      const projects = await storage.getProjectsByOrganization(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching organization projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/organizations/:id/members", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.id as string;
      const members = await storage.getOrganizationMembers(orgId);
      // Fetch user details for each member
      const userIds = members.map(m => m.userId);
      const userDetails = await storage.getUsersByIds(userIds);
      const membersWithUsers = members.map(m => {
        const user = userDetails.find(u => u.id === m.userId);
        const { password, ...safeUser } = user || {};
        return { ...m, user: safeUser };
      });
      res.json(membersWithUsers);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get("/api/organizations/:id/milestones", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;

      // Authorization check (user must be in org)
      const userOrgs = await storage.getOrganizationsByUser(userId);
      if (!userOrgs.some(o => o.id === orgId)) {
        return res.status(403).json({ message: "Access denied to organization" });
      }

      const milestones = await storage.getMilestonesByOrganization(orgId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching organization milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/organizations/:id/invite", isAuthenticated, async (req, res) => {
    try {
      const inviterId = getUserId(req);
      const orgId = req.params.id as string;
      // Normalize and validate input
      const schema = z.object({
        email: z.string().email(),
        role: z.string().transform(val => {
          // Handle potential display names or raw values
          const normalized = val.toLowerCase().replace(" ", "_");
          if (normalized === "administrator") return "admin";
          if (normalized === "team_lead") return "team_lead";
          if (normalized === "member") return "member";
          // If it matches valid roles directly
          if (["admin", "team_lead", "member"].includes(normalized)) return normalized;
          return val; // Let it fail if invalid
        })
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.flatten() });
      }

      const { email, role } = result.data;

      // Additional safety check for role
      if (!["admin", "team_lead", "member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
      }

      // Check if inviter is admin/lead in organization
      const members = await storage.getOrganizationMembers(orgId);
      const inviterMember = members.find(m => m.userId === inviterId);
      if (!inviterMember || (inviterMember.role !== "admin" && inviterMember.role !== "team_lead")) {
        return res.status(403).json({ message: "Only organization leads can invite members" });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await storage.createOrganizationInvitation({
        organizationId: orgId,
        email,
        role: role as "admin" | "team_lead" | "member",
        invitedBy: inviterId,
        token,
        status: "pending",
        expiresAt,
      });

      const organization = await storage.getOrganization(orgId);
      const inviter = await storage.getUser(inviterId);

      const acceptUrl = `${req.protocol}://${req.get("host")}/accept-invitation?token=${token}`;

      await sendOrganizationInvitationEmail({
        to: email,
        organizationName: organization?.name || "Organization",
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "Someone",
        acceptUrl,
        expiresAt,
      });

      res.json(invitation);
    } catch (error) {

      console.error("Error sending organization invitation:", error);
      try {
        const fs = await import("fs");
        fs.appendFileSync("invite_error.log", `${new Date().toISOString()} - Error: ${error}\nStack: ${error instanceof Error ? error.stack : ''}\n\n`);
      } catch (e) {
        // ignore
      }
      res.status(500).json({ message: "Failed to send invitation", error: String(error) });
    }
  });

  app.get("/api/organizations/:id/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;

      // Authorization check
      const isMember = await storage.isUserInOrganization(userId, orgId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Sync/Backfill any missing project invitations to org level
      await storage.backfillOrganizationInvitations(orgId);

      const invitations = await storage.getOrganizationInvitations(orgId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.delete("/api/organizations/:id/invitations/:inviteId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;
      const inviteId = req.params.inviteId as string;

      const members = await storage.getOrganizationMembers(orgId);
      const inviterMember = members.find(m => m.userId === userId);
      if (!inviterMember || (inviterMember.role !== "admin" && inviterMember.role !== "team_lead")) {
        return res.status(403).json({ message: "Only organization leads can cancel invitations" });
      }

      await storage.deleteOrganizationInvitation(inviteId);
      res.json({ message: "Invitation cancelled" });
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      res.status(500).json({ message: "Failed to cancel invitation" });
    }
  });

  app.post("/api/invitations/accept/:token", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const token = req.params.token as string;

      const invitation = await storage.getOrganizationInvitation(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been processed" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      await storage.acceptOrganizationInvitation(token, userId);
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post("/api/organizations/:id/members/:userId/assign-projects", isAuthenticated, async (req, res) => {
    try {
      const adminId = getUserId(req);
      const orgId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const { projectIds } = req.body;

      const members = await storage.getOrganizationMembers(orgId);
      const adminMember = members.find(m => m.userId === adminId);
      if (!adminMember || (adminMember.role !== "admin" && adminMember.role !== "team_lead")) {
        return res.status(403).json({ message: "Only organization leads can assign projects" });
      }

      const isTargetMember = members.some(m => m.userId === targetUserId);
      if (!isTargetMember) {
        return res.status(400).json({ message: "User is not a member of this organization" });
      }

      for (const projectId of projectIds) {
        const project = await storage.getProject(projectId);
        if (project && project.organizationId === orgId) {
          const isAlreadyMember = await storage.isUserInProject(targetUserId, projectId);
          if (!isAlreadyMember) {
            await storage.addProjectMember({
              projectId,
              userId: targetUserId,
              role: "member",
            });
          }
        }
      }

      res.json({ message: "Projects assigned successfully" });
    } catch (error) {
      console.error("Error assigning projects:", error);
      res.status(500).json({ message: "Failed to assign projects" });
    }
  });

  // === Projects ===
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.id as string;

      let project: Project | undefined;

      // Check if it's a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdOrSlug);

      if (isUuid) {
        project = await storage.getProject(projectIdOrSlug);
      } else {
        project = await storage.getProjectBySlug(projectIdOrSlug);
      }

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Authorization check (using the actual ID resolved)
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // ── Plan limit enforcement ───────────────────────────────────────────────
      // Free plan: max 3 projects. Pro/Team: unlimited.
      const mongoUser = await UserMongo.findById(userId);
      const plan = mongoUser?.plan || "free";

      if (plan === "free") {
        // Count projects where this user is a member
        const memberDocs = await ProjectMemberMongo.find({ userId });
        const projectCount = memberDocs.length;
        if (projectCount >= 3) {
          return res.status(403).json({
            message: "Free plan limit reached. You can only have 3 projects on the Free plan. Upgrade to Pro or Team for unlimited projects.",
            code: "PLAN_LIMIT_REACHED",
          });
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // Get user's organization
      const orgs = await storage.getOrganizationsByUser(userId);
      if (orgs.length === 0) {
        // Initialize workspace if no org exists
        await storage.initializeUserWorkspace(userId);
        const newOrgs = await storage.getOrganizationsByUser(userId);
        if (newOrgs.length === 0) {
          return res.status(400).json({ message: "Failed to create workspace" });
        }
      }

      const userOrg = (await storage.getOrganizationsByUser(userId))[0];

      const validated = insertProjectSchema.parse({
        ...req.body,
        organizationId: userOrg.id,
      });

      const project = await storage.createProject(validated);
      await storage.addProjectMember({
        projectId: project.id,
        userId,
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const project = await storage.updateProject(projectId, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get organization members with user details
  app.get("/api/organizations/members", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Get user's organizations
      const organizations = await storage.getOrganizationsByUser(userId);
      if (organizations.length === 0) {
        return res.json([]);
      }

      // Get all members from all user's organizations
      const orgIds = organizations.map(org => org.id);
      const allMembers: any[] = [];

      for (const orgId of orgIds) {
        const members = await storage.getOrganizationMembers(orgId);
        const userIds = members.map(m => m.userId);
        const users = await storage.getUsersByIds(userIds);

        members.forEach(member => {
          const user = users.find(u => u.id === member.userId);
          if (user) {
            const { password, ...userWithoutPassword } = user as any;
            allMembers.push({
              userId: member.userId,
              role: member.role,
              user: userWithoutPassword,
            });
          }
        });
      }

      // Remove duplicates based on userId
      const uniqueMembers = Array.from(
        new Map(allMembers.map(m => [m.userId, m])).values()
      );

      res.json(uniqueMembers);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch organization members" });
    }
  });

  app.get("/api/organizations/members/search", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const query = req.query.q as string;

      if (!query || query.length < 2) {
        return res.json([]);
      }

      const members = await storage.searchOrganizationMembers(userId, query);

      if (members.length === 0) {
        return res.json([]);
      }

      const userIds = members.map(m => m.userId);
      const users = await storage.getUsersByIds(userIds);

      const result = members.map(member => {
        const user = users.find(u => u.id === member.userId);
        if (user) {
          const { password, ...userWithoutPassword } = user as any;
          return {
            userId: member.userId,
            role: member.role,
            user: userWithoutPassword,
          };
        }
        return null;
      }).filter(Boolean);

      // Unique by userId
      const uniqueResult = Array.from(
        new Map(result.map(m => [m!.userId, m])).values()
      );

      res.json(uniqueResult);
    } catch (error) {
      console.error("Error searching organization members:", error);
      res.status(500).json({ message: "Failed to search organization members" });
    }
  });

  app.get("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // === Milestones ===
  app.get("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.projectId as string;

      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const milestones = await storage.getMilestones(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.projectId as string;

      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const data = insertMilestoneSchema.parse({
        ...req.body,
        projectId,
      });

      const milestone = await storage.createMilestone(data);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid milestone data", errors: error.errors });
      }
      console.error("Error creating milestone:", error);
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  app.patch("/api/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = req.params.id as string;

      const milestone = await storage.getMilestone(id);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      const hasAccess = await storage.isUserInProject(userId, milestone.projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateMilestone(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  // Add a member to a project
  app.post("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;
      const { userId: memberUserId, role } = req.body;



      if (!memberUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if requester has access to the project
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if the user being added is in the same organization
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const isInOrg = await storage.isUserInOrganization(memberUserId, project.organizationId);
      if (!isInOrg) {
        return res.status(400).json({ message: "User is not in the organization" });
      }

      // Check if user is already a project member
      const existingMembers = await storage.getProjectMembers(projectId);
      if (existingMembers.some(m => m.userId === memberUserId)) {
        return res.status(400).json({ message: "User is already a project member" });
      }

      // Add the member
      const memberRole = (role === "admin" || role === "team_lead") ? role : "member";
      await storage.addProjectMember({
        projectId,
        userId: memberUserId,
        role: memberRole,
      });

      // Create notification
      await storage.createNotification({
        userId: memberUserId,
        type: "added_to_project",
        title: "Added to project",
        message: `You have been added to ${project.name}`,
        relatedProjectId: projectId,
      });

      res.json({ message: "Member added successfully" });
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.post("/api/projects/:id/invite", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;
      const { email, role } = req.body;
      const memberRole = (role === "admin" || role === "team_lead") ? role : "member";

      if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        const alreadyProjectMember = await storage.isUserProjectMember(existingUser.id, projectId);
        if (alreadyProjectMember) {
          return res.status(400).json({ message: "This user is already a member of this project" });
        }

        const alreadyInOrg = await storage.isUserInOrganization(existingUser.id, project.organizationId);
        if (!alreadyInOrg) {
          await storage.addOrganizationMember({
            organizationId: project.organizationId,
            userId: existingUser.id,
            role: "member",
          });
        }

        await storage.addProjectMember({
          projectId,
          userId: existingUser.id,
          role: memberRole,
        });

        await storage.createNotification({
          userId: existingUser.id,
          type: "added_to_project",
          title: "Added to project",
          message: `You have been added to the project "${project.name}"`,
          relatedProjectId: projectId,
        });

        res.json({ status: "added", user: { id: existingUser.id, email: existingUser.email, firstName: existingUser.firstName, lastName: existingUser.lastName } });
      } else {
        const existingInvites = await storage.getProjectInvitations(projectId);
        if (existingInvites.some(i => i.email === normalizedEmail)) {
          return res.status(400).json({ message: "Invitation already sent to this email" });
        }

        // Sync with Organization Invitations: Ensure existing invite exists or create one
        const existingOrgInvites = await storage.getPendingOrganizationInvitationsByEmail(normalizedEmail);
        const alreadyInvitedToOrg = existingOrgInvites.some(i => i.organizationId === project.organizationId);

        if (!alreadyInvitedToOrg) {
          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

          await storage.createOrganizationInvitation({
            organizationId: project.organizationId,
            email: normalizedEmail,
            role: "member", // Default role for organization level
            invitedBy: userId,
            status: "pending",
            token,
            expiresAt,
          });
        }

        await storage.createProjectInvitation({
          projectId,
          organizationId: project.organizationId,
          email: normalizedEmail,
          role: memberRole,
          invitedBy: userId,
          status: "pending",
        });

        res.json({ status: "invited", email: normalizedEmail });
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ message: "Failed to invite member" });
    }
  });

  app.patch("/api/projects/:id/members/:memberId/role", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;
      const memberId = req.params.memberId as string;
      const { role } = req.body;

      if (!role || !["admin", "team_lead", "member"].includes(role)) {
        return res.status(400).json({ message: "Valid role is required (admin, team_lead, member)" });
      }

      const callerRole = await storage.getProjectMemberRole(userId, projectId);
      if (callerRole !== "admin") {
        return res.status(403).json({ message: "Only admins can change member roles" });
      }

      await storage.updateProjectMemberRole(memberId, projectId, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.get("/api/projects/:id/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id as string;

      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const invitations = await storage.getProjectInvitations(projectId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // === Tasks ===
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tasks = await storage.getAllTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const tasks = await storage.getRecentTasks(userId, limit);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching recent tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });



  app.get("/api/tasks/search", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const {
        status,
        priority,
        assigneeId,
        projectId,
        search,
        dueDateStart,
        dueDateEnd,
        limit,
        offset,
        sortBy,
        sortOrder
      } = req.query;

      // Helper to parse array query params (e.g. ?status=todo&status=in_progress)
      const parseArray = (param: any) => {
        if (!param) return undefined;
        return Array.isArray(param) ? param : [param as string];
      };

      const filters = {
        status: parseArray(status),
        priority: parseArray(priority),
        assigneeId: parseArray(assigneeId),
        projectId: parseArray(projectId),
        parentId: req.query.parentId as string | undefined,
        search: search as string,
        dueDateStart: dueDateStart ? new Date(dueDateStart as string) : undefined,
        dueDateEnd: dueDateEnd ? new Date(dueDateEnd as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        sortBy: sortBy as string,
        sortOrder: (sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
      };

      const result = await storage.searchTasks(userId, filters);
      res.json(result);
    } catch (error) {
      console.error("Error searching tasks:", error);
      res.status(500).json({ message: "Failed to search tasks" });
    }
  });

  app.patch("/api/tasks/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items array" });
      }

      await storage.reorderTasks(userId, items);
      res.status(200).json({ message: "Tasks reordered successfully" });
    } catch (error) {
      console.error("Error reordering tasks:", error);
      res.status(500).json({ message: "Failed to reorder tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const idOrSlug = req.params.id as string;

      let task = await storage.getTask(idOrSlug);
      if (!task) {
        task = await storage.getTaskBySlug(idOrSlug);
      }

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, task.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { projectId } = req.body;

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to project" });
      }

      const validated = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validated);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });



  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Convert date strings to Date objects for timestamp fields
      const updates = { ...req.body };
      if (updates.dueDate !== undefined) {
        updates.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      }
      if (updates.startDate !== undefined) {
        updates.startDate = updates.startDate ? new Date(updates.startDate) : null;
      }

      const task = await storage.updateTask(taskId, updates);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.patch("/api/tasks/bulk/update", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { ids, updates } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }

      const processedUpdates = { ...updates };
      if (processedUpdates.dueDate !== undefined) {
        processedUpdates.dueDate = processedUpdates.dueDate ? new Date(processedUpdates.dueDate) : null;
      }
      if (processedUpdates.startDate !== undefined) {
        processedUpdates.startDate = processedUpdates.startDate ? new Date(processedUpdates.startDate) : null;
      }

      const updatedTasks = await storage.bulkUpdateTasks(userId, ids, processedUpdates);
      res.json(updatedTasks);
    } catch (error) {
      console.error("Error bulk updating tasks:", error);
      res.status(500).json({ message: "Failed to bulk update tasks" });
    }
  });

  app.delete("/api/tasks/bulk/delete", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }

      await storage.bulkDeleteTasks(userId, ids);
      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting tasks:", error);
      res.status(500).json({ message: "Failed to bulk delete tasks" });
    }
  });

  // === Comments ===
  app.get("/api/tasks/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const comments = await storage.getCommentsByTask(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // === Attachments ===
  app.get("/api/tasks/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;

      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const attachments = await storage.getAttachmentsByTask(taskId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/tasks/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;
      const { name, url, fileData, size, type } = req.body;

      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      let finalUrl = url;

      // Handle base64 file upload if present
      if (fileData) {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }

        const fileName = `${Date.now()}-${name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
        const filePath = path.join(uploadsDir, fileName);
        const buffer = Buffer.from(fileData, 'base64');
        fs.writeFileSync(filePath, buffer);
        finalUrl = `/uploads/${fileName}`;
      }

      if (!finalUrl && !fileData) {
        return res.status(400).json({ message: "URL or file data is required" });
      }

      const attachment = await storage.createAttachment({
        taskId,
        name,
        url: finalUrl || "",
        size: size || 0,
        type: type || "link",
        uploadedBy: userId,
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = req.params.id as string;

      // For now we allow deleting by any authenticated user
      // Refinement would be to check if user owns it or has task access
      await storage.deleteAttachment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  app.post("/api/tasks/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id as string;

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validated = insertCommentSchema.parse({
        taskId: taskId,
        authorId: userId,
        content: req.body.content,
      });
      const comment = await storage.createComment(validated);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // === Time Logs ===
  app.get("/api/timelogs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getTimeLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.get("/api/timelogs/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentTimeLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching recent time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.get("/api/timelogs/active", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getActiveTimeLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching active time logs:", error);
      res.status(500).json({ message: "Failed to fetch active time logs" });
    }
  });

  app.post("/api/timelogs/start", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { taskId } = req.body;

      if (!taskId) {
        return res.status(400).json({ message: "Task ID is required" });
      }

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to task" });
      }

      // Check if task is already running
      const activeLogs = await storage.getActiveTimeLogs(userId);
      if (activeLogs.some(log => log.taskId === taskId)) {
        return res.status(400).json({ message: "Timer already running for this task" });
      }

      const log = await storage.createTimeLog({
        taskId,
        userId,
        startTime: new Date(),
      });

      res.status(201).json(log);
    } catch (error) {
      console.error("Error starting time log:", error);
      res.status(500).json({ message: "Failed to start timer" });
    }
  });

  app.post("/api/timelogs/stop", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { taskId } = req.body; // taskId from body for stopping a specific timer

      const activeLogs = await storage.getActiveTimeLogs(userId);

      if (activeLogs.length === 0) {
        return res.status(400).json({ message: "No active timer found" });
      }

      const now = new Date();
      let stoppedLogs: any[] = [];

      if (taskId) {
        // Stop specific task timer
        const logToStop = activeLogs.find(log => log.taskId === taskId);
        if (!logToStop) {
          return res.status(404).json({ message: "No active timer found for this task" });
        }
        const stopped = await storage.stopTimeLog(logToStop.id, now);
        stoppedLogs.push(stopped);
      } else {
        // Stop all active timers (legacy support / stop all button)
        for (const log of activeLogs) {
          const stopped = await storage.stopTimeLog(log.id, now);
          stoppedLogs.push(stopped);
        }
      }

      res.json(stoppedLogs.length === 1 ? stoppedLogs[0] : stoppedLogs);
    } catch (error) {
      console.error("Error stopping time log:", error);
      res.status(500).json({ message: "Failed to stop timer" });
    }
  });

  app.post("/api/timelogs/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logId = req.params.id as string;

      // Get the time log to check authorization
      const log = await storage.getTimeLog(logId);
      if (!log) {
        return res.status(404).json({ message: "Time log not found" });
      }

      // Check if user can access the task associated with this log
      const hasAccess = await storage.canUserAccessTask(userId, log.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const approved = await storage.approveTimeLog(logId);
      res.json(approved);
    } catch (error) {
      console.error("Error approving time log:", error);
      res.status(500).json({ message: "Failed to approve time log" });
    }
  });

  // === Notifications ===
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const notificationId = req.params.id as string;
      await storage.markNotificationRead(notificationId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      await storage.markAllNotificationsRead(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark notifications read" });
    }
  });

  return httpServer;
}
