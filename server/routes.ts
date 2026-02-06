import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { insertProjectSchema, insertTaskSchema, insertCommentSchema } from "@shared/schema";
import { seedDatabase } from "./seed";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

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

  app.post("/api/auth/register", async (req, res) => {
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
      });

      // Process any pending invitations for this email
      try {
        const normalizedEmail = data.email.trim().toLowerCase();
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

  app.post("/api/auth/login", async (req, res) => {
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
      const projectId = req.params.id;
      
      // Authorization check
      const hasAccess = await storage.isUserInProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
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
      const projectId = req.params.id;
      
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
      const projectId = req.params.id;
      
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
      const projectId = req.params.id;
      
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

  app.get("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id;
      
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

  app.post("/api/projects/:id/invite", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectId = req.params.id;
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
      const projectId = req.params.id;
      const memberId = req.params.memberId;
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
      const projectId = req.params.id;

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

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id;
      
      // Authorization check
      const hasAccess = await storage.canUserAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
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
      const taskId = req.params.id;
      
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
      const taskId = req.params.id;
      
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

  // === Comments ===
  app.get("/api/tasks/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id;
      
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

  app.post("/api/tasks/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskId = req.params.id;
      
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
      const log = await storage.getActiveTimeLog(userId);
      res.json(log || null);
    } catch (error) {
      console.error("Error fetching active time log:", error);
      res.status(500).json({ message: "Failed to fetch active time log" });
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

      // Auto-stop existing timer if one is running
      const existing = await storage.getActiveTimeLog(userId);
      if (existing) {
        await storage.stopTimeLog(existing.id, new Date());
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

      const activeLog = await storage.getActiveTimeLog(userId);
      if (!activeLog) {
        return res.status(400).json({ message: "No active timer found" });
      }

      const stoppedLog = await storage.stopTimeLog(activeLog.id, new Date());
      res.json(stoppedLog);
    } catch (error) {
      console.error("Error stopping time log:", error);
      res.status(500).json({ message: "Failed to stop timer" });
    }
  });

  app.post("/api/timelogs/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const logId = req.params.id;
      
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
      await storage.markNotificationRead(req.params.id, userId);
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
