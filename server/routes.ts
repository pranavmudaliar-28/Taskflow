import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { insertProjectSchema, insertTaskSchema, insertCommentSchema, insertOrganizationInvitationSchema, insertMilestoneSchema, type Project } from "@shared/schema";
import { sendOrganizationInvitationEmail, sendPasswordResetEmail } from "./email";
import { apiLimiter, authLimiter, inviteLimiter } from "./middleware/rateLimiter";
import { sanitizeInput } from "./middleware/sanitize";
import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registerStripeRoutes } from "./stripe";
import { generateSlug } from "./slug-utils";
import { UserMongo, ProjectMongo, ProjectMemberMongo } from "../shared/mongodb-schema";
import fs from "fs";
import path from "path";
import express from "express";
import { authMiddleware } from "./middleware/authMiddleware";
import { authorize, authorizeOrg } from "./middleware/roleMiddleware";
import { validateRequest } from "./middleware/validateRequest";
import { TokenService } from "./services/tokenService";
import { Serializer } from "./utils/serializers";
import { logger } from "./utils/logger";


export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Helper to resolve project ID or Slug
  const resolveProject = async (idOrSlug: string): Promise<any | undefined> => {
    console.log(`[resolveProject] Attempting to resolve project with idOrSlug: "${idOrSlug}"`);

    // Attempt lookup by ID first 
    const byId = await storage.getProject(idOrSlug);
    console.log(`[resolveProject] Result of storage.getProject("${idOrSlug}"):`, byId ? `Found (${byId.name})` : 'Not Found');
    if (byId) return byId;

    // Fallback to searching by slug
    const bySlug = await storage.getProjectBySlug(idOrSlug);
    console.log(`[resolveProject] Result of storage.getProjectBySlug("${idOrSlug}"):`, bySlug ? `Found (${bySlug.name})` : 'Not Found');
    return bySlug;
  };

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

  // ── Forgot Password Routes (Public) ──────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      console.log(`[Auth] Processing forgot password request for: ${email}`);

      const user = await storage.getUserByEmail(email.toLowerCase());

      if (!user) {
        console.log(`[Auth] Forgot password aborted: No user found for email ${email}`);
        return res.status(404).json({ message: "No account found with that email address." });
      }

      console.log(`[Auth] User found. Proceeding to direct reset step for ${user.email}`);
      res.json({ message: "Email verified. Proceeding to reset password." });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(6, "Password must be at least 6 characters")
      }).parse(req.body);

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.id) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to reset password" });
    }
  });



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

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = await authStorage.upsertUser({
        email: req.body.email,
        password: hashedPassword,
        firstName: req.body.firstName || "",
        lastName: req.body.lastName || "",
        onboardingStep: "plan", // Ensure they start at plan step
        role: "member",
        plan: "free",
        seeded: false
      });

      // Initialize workspace for the new user (now part of onboarding completion)
      // await storage.initializeUserWorkspace(user.id);

      // We removed the auto path here so that invited users can see the "Accept Invitation" screen instead of bypassing it.

      // Generate JWT
      if (!user.id) {
        return res.status(500).json({ message: "Registration succeeded but user ID is missing" });
      }
      const token = TokenService.generateToken({
        sub: user.id,
        email: user.email || "",
        role: "member", // Default role
      });

      // Check if this new user has a pending invitation for their email
      const normalizedEmail = (req.body.email || "").trim().toLowerCase();
      const pendingInvites = await storage.getPendingOrganizationInvitationsByEmail(normalizedEmail);
      const pendingInviteToken = pendingInvites && pendingInvites.length > 0 ? pendingInvites[0].token : null;

      // Initialize session
      req.login(user, (err) => {
        if (err) {
          console.error("Session initialization error during registration:", err);
          return res.status(500).json({ message: "Registration succeeded but session failed" });
        }

        logger.info('User registered and logged in', { userId: user.id, email: user.email });

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: 'lax' as const,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        };
        res.cookie('token', token, cookieOptions);

        res.json({
          user: Serializer.user(user),
          token,
          // Tell the client immediately if this user has a pending invite
          pendingInviteToken,
        });
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

      // Generate JWT
      const token = TokenService.generateToken({
        sub: user.id as string,
        email: user.email || "",
        role: (user as any).role || "member",
      });

      // Check if this user has a pending invitation for their email
      const normalizedEmail = (user.email || "").trim().toLowerCase();
      const pendingInvites = await storage.getPendingOrganizationInvitationsByEmail(normalizedEmail);
      const pendingInviteToken = pendingInvites && pendingInvites.length > 0 ? pendingInvites[0].token : null;

      // Initialize session
      console.log(`[Auth] Initializing session for user: ${user.id}`);
      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Session initialization error during login:", err);
          return res.status(500).json({ message: "Login succeeded but session failed" });
        }

        console.log(`[Auth] Session initialized successfully for user: ${user.id}`);
        logger.info('User logged in with session', { userId: user.id });

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: 'lax' as const,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        };
        res.cookie('token', token, cookieOptions);

        res.json({
          user: Serializer.user(user),
          token,
          // Tell the client immediately if this user has a pending invite
          pendingInviteToken,
        });
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Please check your input", errors: error.issues });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const userId = (req as any).user?.id;
    console.log(`[Logout] Starting aggressive logout for user: ${userId}`);

    // Extract and blacklist token
    const authHeader = req.headers.authorization;
    let token = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) token = match[1];
    }

    if (token) {
      await TokenService.invalidateToken(token);
    }

    // 1. Manually unset req.user if present
    if ((req as any).user) {
      console.log(`[Logout] Unsetting req.user manually`);
      (req as any).user = undefined;
    }

    req.logout((err) => {
      if (err) {
        logger.error('Logout error', { error: err.message });
        return res.status(500).json({ message: "Logout failed" });
      }

      const cookieOptions = {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'lax' as const
      };

      // Also clear without sameSite/secure just in case
      const simpleCookieOptions = {
        path: '/',
        httpOnly: true
      };

      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            logger.error('Session destruction error', { error: destroyErr.message });
          }

          res.clearCookie('connect.sid', cookieOptions);
          res.clearCookie('connect.sid', simpleCookieOptions);
          res.clearCookie('token', cookieOptions);
          res.clearCookie('token', simpleCookieOptions);

          console.log(`[Logout] Session destroyed and cookies cleared for user: ${userId}`);
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.clearCookie('connect.sid', cookieOptions);
        res.clearCookie('connect.sid', simpleCookieOptions);
        res.clearCookie('token', cookieOptions);
        res.clearCookie('token', simpleCookieOptions);
        console.log(`[Logout] No session found, cookies cleared for user: ${userId}`);
        res.json({ message: "Logged out successfully" });
      }
    });
  });


  // === User Profile Routes ===
  const updateProfileSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
  });

  app.patch("/api/user/profile", authMiddleware, apiLimiter, sanitizeInput, async (req, res) => {
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

  app.post("/api/user/change-password", authMiddleware, async (req, res) => {
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
  app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);

      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // === Stripe & Onboarding ===
  app.post("/api/onboarding/setup-organization", authMiddleware, async (req, res) => {
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

            const invitation = await storage.createOrganizationInvitation({
              organizationId: org.id,
              email: invitedEmail.trim().toLowerCase(),
              role: "member",
              status: "pending",
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

  // Only allow marking onboarding complete if the user belongs to an org
  // (either they created one, or they accepted an invitation)
  app.post("/api/onboarding/complete", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { force } = req.body; // only invitation-acceptance path uses force=true

      if (!force) {
        // Check the user actually has an org before completing onboarding
        const orgs = await storage.getOrganizationsByUser(userId);
        if (!orgs || orgs.length === 0) {
          return res.status(400).json({
            message: "Please create or join an organization before completing onboarding.",
            code: "NO_ORGANIZATION"
          });
        }
      }

      await storage.updateUser(userId, { onboardingStep: "completed" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Onboarding status endpoint — tells frontend what a user has/hasn't done
  app.get("/api/onboarding/status", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const orgs = await storage.getOrganizationsByUser(userId);
      const hasOrg = orgs.length > 0;
      const isCompleted = user.onboardingStep === "completed";

      res.json({
        onboardingStep: user.onboardingStep,
        hasOrganization: hasOrg,
        isCompleted,
        // User can access dashboard only if onboarding is completed
        canAccessDashboard: isCompleted,
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  // === Organizations ===
  app.get("/api/organizations", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const organizations = await storage.getOrganizationsByUser(userId);

      // Enhance organizations with user's role
      const orgIds = organizations.map((o: { id: string }) => o.id);
      const memberships = await storage.getOrganizationMembersForUser(userId, orgIds);

      const roleMap: Record<string, string> = {};
      memberships.forEach((m: any) => {
        if (m.organizationId) {
          roleMap[m.organizationId.toString()] = m.role;
        }
      });

      const enhancedOrgs = organizations.map((org: any) => {
        return {
          ...org,
          role: org.id ? (roleMap[org.id.toString()] || "member") : "member"
        };
      });

      res.json(enhancedOrgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id/projects", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;

      // Verify user belongs to this org
      const userOrgs = await storage.getOrganizationsByUser(userId);
      if (!userOrgs.some((o: { id: string }) => o.id === orgId)) {
        return res.status(403).json({ message: "Access denied to organization" });
      }

      const projects = await storage.getProjectsByOrganization(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching organization projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/organizations/:id/members", authMiddleware, async (req, res) => {
    try {
      const orgId = req.params.id as string;
      const members = await storage.getOrganizationMembers(orgId);
      // Fetch user details for each member
      const userIds = members.map((m: { userId: string }) => m.userId);
      const userDetails = await storage.getUsersByIds(userIds);
      const membersWithUsers = members.map((m: { userId: string }) => {
        const user = userDetails.find((u: any) => u.id === m.userId);
        const { password: _, ...safeUser } = user || {};
        return { ...m, user: safeUser };
      });
      res.json(membersWithUsers);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.delete("/api/organizations/:id/members/:memberId", authMiddleware, authorizeOrg(["admin", "team_lead"]), async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;
      const memberId = req.params.memberId as string;

      const members = await storage.getOrganizationMembers(orgId);
      const targetMember = members.find((m: { id: string, userId: string }) => m.id === memberId);
      if (!targetMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      await storage.removeOrganizationMember(memberId);

      // Attempt to clean up project memberships for this user in this org
      // We don't fail the request if it fails, but we try our best.
      try {
        const projects = await storage.getProjectsByOrganization(orgId);
        for (const project of projects) {
          const projectMembersList = await storage.getProjectMembers(project.id);
          const projectMember = projectMembersList.find((pm: { userId: string, id: string }) => pm.userId === targetMember.userId);
          if (projectMember) {
            await storage.removeProjectMember(projectMember.id);
          }
        }
      } catch (e) {
        console.error("Failed to remove project memberships after organization removal", e);
      }

      logger.info('Organization member removed', {
        orgId,
        memberId,
        removedBy: userId
      });

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  app.get("/api/organizations/:id/milestones", authMiddleware, async (req, res) => {
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

  app.post("/api/organizations/:id/invite", authMiddleware, authorizeOrg(["admin", "team_lead"]), async (req, res) => {
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

      logger.info('Organization invitation sent', {
        orgId,
        email,
        role,
        invitedBy: inviterId
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

  app.get("/api/organizations/:id/invitations", authMiddleware, async (req, res) => {
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

  app.delete("/api/organizations/:id/invitations/:inviteId", authMiddleware, authorizeOrg(["admin", "team_lead"]), async (req, res) => {
    try {
      const userId = getUserId(req);
      const orgId = req.params.id as string;
      const inviteId = req.params.inviteId as string;

      await storage.deleteOrganizationInvitation(inviteId);
      logger.info('Organization invitation cancelled', {
        orgId,
        inviteId,
        cancelledBy: userId
      });
      res.json({ message: "Invitation cancelled" });
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      res.status(500).json({ message: "Failed to cancel invitation" });
    }
  });

  app.get("/api/invitations/pending", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(getUserId(req));
      if (!user || !user.email) {
        return res.json([]);
      }

      const normalizedEmail = user.email.trim().toLowerCase();
      const orgInvites = await storage.getPendingOrganizationInvitationsByEmail(normalizedEmail);
      res.json(orgInvites);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  // Public endpoint: get invitation details by token (no auth needed, shown before accept)
  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const token = req.params.token as string;
      const invitation = await storage.getOrganizationInvitation(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      // Fetch org name to display on the accept page
      const org = await storage.getOrganization(invitation.organizationId);
      res.json({
        token: invitation.token,
        email: invitation.email,
        organizationId: invitation.organizationId,
        organizationName: org?.name || "the organization",
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching invitation details:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });


  app.post("/api/invitations/accept/:token", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const token = req.params.token as string;

      const invitation = await storage.getOrganizationInvitation(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        if (invitation.status === "accepted") {
          return res.json({ message: "Invitation already accepted" });
        }
        return res.status(400).json({ message: "Invitation has already been processed" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      await storage.acceptOrganizationInvitation(token, userId);

      // Update onboarding step to completed since they are joining an organization
      await storage.updateUser(userId, { onboardingStep: "completed" });

      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post("/api/organizations/:id/members/:userId/assign-projects", authMiddleware, async (req, res) => {
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
  app.get("/api/projects", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.id as string;

      const project = await resolveProject(projectIdOrSlug);

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

  app.post("/api/projects", authMiddleware, async (req, res) => {
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
      const member = await storage.addProjectMember({
        projectId: project.id,
        userId,
        role: "admin"
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

  app.patch("/api/projects/:id", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.id as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateProject(project.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.id as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(project.id);
      logger.info('Project deleted', {
        projectId: project.id,
        deletedBy: userId
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/tasks", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.id as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tasks = await storage.getTasksByProject(project.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get organization members with user details
  app.get("/api/organizations/members", authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Get user's organizations
      const organizations = await storage.getOrganizationsByUser(userId);
      if (organizations.length === 0) {
        return res.json([]);
      }

      // Get all members from all user's organizations
      const orgIds = organizations.map((org: { id: string }) => org.id);
      const allMembers: any[] = [];

      for (const orgId of orgIds) {
        const orgMembers = await storage.getOrganizationMembers(orgId);
        const orgMemberMap = new Map(orgMembers.map((m: { userId: string; role: string }) => [m.userId, m.role]));
        const userIds = orgMembers.map((m: { userId: string }) => m.userId);
        const users = await storage.getUsersByIds(userIds);

        orgMembers.forEach((member: { userId: string; role: string }) => {
          const user = users.find((u: any) => u.id === member.userId);
          if (user) {
            const { password: _, ...userWithoutPassword } = user as any;
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
        new Map(allMembers.map((m: { userId: string }) => [m.userId, m])).values()
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

      const userIds = members.map((m: { userId: string }) => m.userId);
      const users = await storage.getUsersByIds(userIds);

      const result = members.map((member: { userId: string; role: string }) => {
        const user = users.find((u: any) => u.id === member.userId);
        if (user) {
          const { password: _, ...userWithoutPassword } = user as any;
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
        new Map(result.filter(m => m !== null).map((m: any) => [m.userId, m])).values()
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
      const projectIdOrSlug = req.params.id as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getProjectMembers(project.id);
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
      const projectIdOrSlug = req.params.projectId as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const milestones = await storage.getMilestones(project.id);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectIdOrSlug = req.params.projectId as string;

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const data = insertMilestoneSchema.parse({
        ...req.body,
        projectId: project.id,
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
      const projectIdOrSlug = req.params.id as string;
      console.log(`[Members Post API] projectIdOrSlug:`, projectIdOrSlug);
      const { userId: memberUserId, role } = req.body;

      if (!memberUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const project = await resolveProject(projectIdOrSlug);
      console.log(`[Members Post API] resolvedProject:`, project?.id || null);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if requester has access to the project
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const isInOrg = await storage.isUserInOrganization(memberUserId, project.organizationId);
      if (!isInOrg) {
        return res.status(400).json({ message: "User is not in the organization" });
      }

      // Check if user is already a project member
      const existingMembers = await storage.getProjectMembers(project.id);
      if (existingMembers.some(m => m.userId === memberUserId)) {
        return res.status(400).json({ message: "User is already a project member" });
      }

      // Add the member
      const memberRole = (role === "admin" || role === "team_lead") ? role : "member";
      await storage.addProjectMember({
        projectId: project.id,
        userId: memberUserId,
        role: memberRole,
      });

      // Create notification
      await storage.createNotification({
        userId: memberUserId,
        type: "added_to_project",
        title: "Added to project",
        message: `You have been added to ${project.name}`,
        relatedProjectId: project.id,
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
      const projectIdOrSlug = req.params.id as string;
      const { email, role } = req.body;
      const memberRole = (role === "admin" || role === "team_lead") ? role : "member";

      if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const project = await resolveProject(projectIdOrSlug);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access
      const hasAccess = await storage.isUserInProject(userId, project.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const inOrg = await storage.isUserInOrganization(userId, project.organizationId);
      if (!inOrg) {
        // Double check they were specifically added to this project
        const projectMemberRecs = await storage.getProjectMembersForUser(userId);
        const isSelectedProjectMember = projectMemberRecs.some((pm: { projectId: string }) => pm.projectId === projectIdOrSlug);
        if (!isSelectedProjectMember) {
          return res.status(403).json({ message: "Forbidden: You are not a member of this project" });
        }
      }
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser && existingUser.id) {
        // User exists, just add them directly to project
        await storage.addProjectMember({
          projectId: project.id,
          userId: existingUser.id,
          role: memberRole,
        });

        // Add them to org if not already
        const inOrg = await storage.isUserInOrganization(existingUser.id, project.organizationId);
        if (!inOrg) {
          await storage.addOrganizationMember({
            organizationId: project.organizationId,
            userId: existingUser.id,
            role: "member"
          });
        }

        await storage.createNotification({
          userId: existingUser.id,
          type: "added_to_project",
          title: "Added to project",
          message: `You have been added to the project "${project.name}"`,
          relatedProjectId: project.id,
        });

        res.json({ status: "added", user: { id: existingUser.id, email: existingUser.email, firstName: existingUser.firstName, lastName: existingUser.lastName } });
      } else {
        const existingInvites = await storage.getProjectInvitations(project.id);
        const pendingInvites = existingInvites.filter((i: { status: string }) => i.status === "pending");
        if (pendingInvites.some(i => i.email === normalizedEmail)) {
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
          projectId: project.id,
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

      // Notify assignee if someone other than the creator is assigned
      if (task.assigneeId && task.assigneeId !== userId) {
        try {
          const project = await storage.getProject(task.projectId);
          await storage.createNotification({
            userId: task.assigneeId,
            type: "task_assigned",
            title: "New task assigned to you",
            message: `You have been assigned to "${task.title}"${project ? ` in ${project.name}` : ``}`,
            relatedTaskId: task.id,
            relatedProjectId: task.projectId,
          });
        } catch (notifErr) {
          console.error("[Notifications] Failed to send task_assigned notification:", notifErr);
        }
      }

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
      const idOrSlug = req.params.id as string;
      // Resolve actual task ID if a slug was provided
      let taskToUpdate = await storage.getTask(idOrSlug);

      if (!taskToUpdate) {
        taskToUpdate = await storage.getTaskBySlug(idOrSlug);
      }

      if (!taskToUpdate) {
        console.warn(`[Tasks] Task not found for ID/Slug: ${idOrSlug}`);
        return res.status(404).json({ message: "Task not found" });
      }

      const taskId = taskToUpdate.id;

      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        console.warn(`[Tasks] Access denied for user ${userId} to task ${taskId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      // Capture old state for notification diff
      const oldTask = taskToUpdate;

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
        console.error(`[Tasks] Failed to update task ${taskId} in storage`);
        return res.status(404).json({ message: "Task not found" });
      }

      console.log(`[Tasks] Task ${taskId} updated successfully`);

      // ── Fire notifications asynchronously (don't block response) ──
      (async () => {
        try {
          const project = await storage.getProject(task.projectId);
          const projectName = project?.name || "";

          // 1. Status changed — notify the assignee
          if (oldTask && updates.status && updates.status !== oldTask.status && task.assigneeId && task.assigneeId !== userId) {
            const statusLabels: Record<string, string> = {
              todo: "To Do", in_progress: "In Progress", in_review: "In Review",
              testing: "Testing", done: "Done",
            };
            await storage.createNotification({
              userId: task.assigneeId,
              type: "status_changed",
              title: "Task status updated",
              message: `"${task.title}" was moved to ${statusLabels[updates.status] || updates.status}${projectName ? ` in ${projectName}` : ``}`,
              relatedTaskId: task.id,
              relatedProjectId: task.projectId,
            });
          }

          // 2. Assignee changed — notify the new assignee
          if (oldTask && updates.assigneeId && updates.assigneeId !== oldTask.assigneeId && updates.assigneeId !== userId) {
            await storage.createNotification({
              userId: updates.assigneeId,
              type: "task_assigned",
              title: "Task assigned to you",
              message: `You have been assigned to "${task.title}"${projectName ? ` in ${projectName}` : ``}`,
              relatedTaskId: task.id,
              relatedProjectId: task.projectId,
            });
          }
        } catch (notifErr) {
          console.error("[Notifications] Failed to fire task update notifications:", notifErr);
        }
      })();

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
        parentId: req.body.parentId,
        mentions: req.body.mentions || [],
      });
      const comment = await storage.createComment(validated);

      // ── Fire comment notifications asynchronously ──
      (async () => {
        try {
          const task = await storage.getTask(taskId);
          if (!task) return;
          const project = await storage.getProject(task.projectId);
          const commenter = await storage.getUser(userId);
          const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}`.trim() : "Someone";
          const projectName = project?.name || "";
          const notified = new Set<string>();

          // Notify the task assignee (if not the commenter)
          if (task.assigneeId && task.assigneeId !== userId) {
            notified.add(task.assigneeId);
            await storage.createNotification({
              userId: task.assigneeId,
              type: "mentioned",
              title: "New comment on your task",
              message: `${commenterName} commented on "${task.title}"${projectName ? ` in ${projectName}` : ``}`,
              relatedTaskId: task.id,
              relatedProjectId: task.projectId,
            });
          }

          // Notify explicitly @mentioned users
          const mentions: string[] = req.body.mentions || [];
          for (const mentionedUserId of mentions) {
            if (mentionedUserId === userId || notified.has(mentionedUserId)) continue;
            notified.add(mentionedUserId);
            await storage.createNotification({
              userId: mentionedUserId,
              type: "mentioned",
              title: "You were mentioned in a comment",
              message: `${commenterName} mentioned you in a comment on "${task.title}"${projectName ? ` in ${projectName}` : ``}`,
              relatedTaskId: task.id,
              relatedProjectId: task.projectId,
            });
          }
        } catch (notifErr) {
          console.error("[Notifications] Failed to fire comment notifications:", notifErr);
        }
      })();

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.post("/api/comments/:id/react", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const commentId = req.params.id;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ message: "Emoji is required" });
      }

      const updatedComment = await storage.toggleCommentReaction(String(commentId), String(userId), String(emoji));
      if (!updatedComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json(updatedComment);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  });

  // POST endpoints for features
  app.post("/api/time-logs", isAuthenticated, async (req, res) => {
    try {
      const logData = req.body;
      const userObj = req.user as any;
      const newLog = await storage.createTimeLog({
        ...logData,
        userId: userObj.id
      });
      res.status(201).json(newLog);
    } catch (error) {
      console.error("Error creating time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
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

      // Only block if the exact same task is already being tracked
      const activeLogs = await storage.getActiveTimeLogs(userId);
      if (activeLogs.some(log => log.taskId === taskId)) {
        return res.status(400).json({ message: "Timer already running for this task" });
      }

      const newLog = await storage.createTimeLog({
        taskId,
        userId,
        startTime: new Date(),
        approved: false
      });

      res.status(201).json(newLog);
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
