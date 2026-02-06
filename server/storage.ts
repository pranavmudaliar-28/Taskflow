import { 
  organizations, projects, tasks, timeLogs, comments, notifications,
  organizationMembers, projectMembers, projectInvitations,
  type Organization, type InsertOrganization,
  type Project, type InsertProject,
  type Task, type InsertTask,
  type TimeLog, type InsertTimeLog,
  type Comment, type InsertComment,
  type Notification, type InsertNotification,
  type OrganizationMember, type InsertOrganizationMember,
  type ProjectMember, type InsertProjectMember,
  type ProjectInvitation, type InsertProjectInvitation,
} from "@shared/schema";
import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";

export type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  addedAt: Date | null;
  user: Omit<User, 'password'>;
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByIds(ids: string[]): Promise<User[]>;
  
  // Organizations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByUser(userId: string): Promise<Organization[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMembers(orgId: string): Promise<OrganizationMember[]>;
  isUserInOrganization(userId: string, orgId: string): Promise<boolean>;
  
  // User initialization
  initializeUserWorkspace(userId: string): Promise<Organization>;
  
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrganization(orgId: string): Promise<Project[]>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]>;
  getProjectMemberRole(userId: string, projectId: string): Promise<string | null>;
  updateProjectMemberRole(userId: string, projectId: string, role: string): Promise<void>;
  isUserInProject(userId: string, projectId: string): Promise<boolean>;
  isUserProjectMember(userId: string, projectId: string): Promise<boolean>;
  
  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getRecentTasks(userId: string, limit?: number): Promise<Task[]>;
  getAllTasks(userId: string): Promise<Task[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  canUserAccessTask(userId: string, taskId: string): Promise<boolean>;
  
  // Time Logs
  createTimeLog(log: InsertTimeLog): Promise<TimeLog>;
  getTimeLog(id: string): Promise<TimeLog | undefined>;
  getActiveTimeLog(userId: string): Promise<TimeLog | undefined>;
  stopTimeLog(id: string, endTime: Date): Promise<TimeLog | undefined>;
  getTimeLogsByUser(userId: string): Promise<TimeLog[]>;
  getTimeLogsByTask(taskId: string): Promise<TimeLog[]>;
  getRecentTimeLogs(userId: string, limit?: number): Promise<TimeLog[]>;
  approveTimeLog(id: string): Promise<TimeLog | undefined>;
  
  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByTask(taskId: string): Promise<Comment[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // Project Invitations
  createProjectInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation>;
  getProjectInvitations(projectId: string): Promise<ProjectInvitation[]>;
  getPendingInvitationsByEmail(email: string): Promise<ProjectInvitation[]>;
  deleteProjectInvitation(id: string): Promise<void>;
  
  // Dashboard Stats
  getDashboardStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    totalTimeLogged: number;
    projectCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const result = await db.select().from(users).where(inArray(users.id, ids));
    return result;
  }

  // Organizations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const memberRecords = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
    
    if (memberRecords.length === 0) return [];
    
    const orgIds = memberRecords.map(m => m.organizationId);
    const orgs = await db.select().from(organizations).where(inArray(organizations.id, orgIds));
    return orgs;
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(member).returning();
    return created;
  }

  async getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));
  }

  async isUserInOrganization(userId: string, orgId: string): Promise<boolean> {
    const [member] = await db.select().from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, orgId)));
    return !!member;
  }

  // Initialize user workspace (creates org for new users)
  async initializeUserWorkspace(userId: string): Promise<Organization> {
    // Check if user already has an organization
    const existingOrgs = await this.getOrganizationsByUser(userId);
    if (existingOrgs.length > 0) {
      return existingOrgs[0];
    }

    // Create a new organization for this user
    const user = await this.getUser(userId);
    const orgName = user?.firstName ? `${user.firstName}'s Workspace` : "My Workspace";
    
    const org = await this.createOrganization({
      name: orgName,
      ownerId: userId,
    });

    // Add user as admin member
    await this.addOrganizationMember({
      organizationId: org.id,
      userId: userId,
      role: "admin",
    });

    return org;
  }

  // Projects
  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByOrganization(orgId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.organizationId, orgId));
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    // Get user's organizations
    const orgs = await this.getOrganizationsByUser(userId);
    if (orgs.length === 0) return [];
    
    const orgIds = orgs.map(o => o.id);
    return db.select().from(projects)
      .where(inArray(projects.organizationId, orgIds))
      .orderBy(desc(projects.createdAt));
  }

  async isUserInProject(userId: string, projectId: string): Promise<boolean> {
    return this.isUserProjectMember(userId, projectId);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<void> {
    // Delete related tasks first
    await db.delete(tasks).where(eq(tasks.projectId, id));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const existing = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, member.projectId),
        eq(projectMembers.userId, member.userId),
      ));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(projectMembers).values(member).returning();
    return created;
  }

  async isUserProjectMember(userId: string, projectId: string): Promise<boolean> {
    const [row] = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ));
    return !!row;
  }

  async getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
    const members = await db.select().from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    if (members.length === 0) return [];
    const userIds = members.map(m => m.userId);
    const usersList = await this.getUsersByIds(userIds);
    const usersMap = new Map(usersList.map(u => [u.id, u]));
    return members.map(m => {
      const u = usersMap.get(m.userId);
      if (!u) return null;
      const { password, ...userWithoutPassword } = u as any;
      return {
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        addedAt: m.addedAt,
        user: userWithoutPassword,
      };
    }).filter(Boolean) as ProjectMemberWithUser[];
  }

  async getProjectMemberRole(userId: string, projectId: string): Promise<string | null> {
    const [row] = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ));
    return row?.role || null;
  }

  async updateProjectMemberRole(userId: string, projectId: string, role: string): Promise<void> {
    await db.update(projectMembers)
      .set({ role: role as any })
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ));
  }

  // Tasks
  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.order);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getRecentTasks(userId: string, limit = 10): Promise<Task[]> {
    const userProjects = await this.getProjectsByUser(userId);
    if (userProjects.length === 0) return [];
    
    const projectIds = userProjects.map(p => p.id);
    return db.select().from(tasks)
      .where(inArray(tasks.projectId, projectIds))
      .orderBy(desc(tasks.updatedAt))
      .limit(limit);
  }

  async getAllTasks(userId: string): Promise<Task[]> {
    const userProjects = await this.getProjectsByUser(userId);
    if (userProjects.length === 0) return [];
    
    const projectIds = userProjects.map(p => p.id);
    return db.select().from(tasks)
      .where(inArray(tasks.projectId, projectIds))
      .orderBy(desc(tasks.createdAt));
  }

  async canUserAccessTask(userId: string, taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;
    return this.isUserInProject(userId, task.projectId);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(timeLogs).where(eq(timeLogs.taskId, id));
    await db.delete(comments).where(eq(comments.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Time Logs
  async createTimeLog(log: InsertTimeLog): Promise<TimeLog> {
    const [created] = await db.insert(timeLogs).values(log).returning();
    return created;
  }

  async getTimeLog(id: string): Promise<TimeLog | undefined> {
    const [log] = await db.select().from(timeLogs).where(eq(timeLogs.id, id));
    return log || undefined;
  }

  async getActiveTimeLog(userId: string): Promise<TimeLog | undefined> {
    const [log] = await db.select().from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), isNull(timeLogs.endTime)));
    return log || undefined;
  }

  async stopTimeLog(id: string, endTime: Date): Promise<TimeLog | undefined> {
    const log = await this.getTimeLog(id);
    if (!log) return undefined;
    
    const duration = Math.floor((endTime.getTime() - new Date(log.startTime).getTime()) / 1000);
    
    const [updated] = await db.update(timeLogs)
      .set({ endTime, duration })
      .where(eq(timeLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async getTimeLogsByUser(userId: string): Promise<TimeLog[]> {
    return db.select().from(timeLogs)
      .where(eq(timeLogs.userId, userId))
      .orderBy(desc(timeLogs.startTime));
  }

  async getTimeLogsByTask(taskId: string): Promise<TimeLog[]> {
    return db.select().from(timeLogs)
      .where(eq(timeLogs.taskId, taskId))
      .orderBy(desc(timeLogs.startTime));
  }

  async getRecentTimeLogs(userId: string, limit = 10): Promise<TimeLog[]> {
    return db.select().from(timeLogs)
      .where(eq(timeLogs.userId, userId))
      .orderBy(desc(timeLogs.startTime))
      .limit(limit);
  }

  async approveTimeLog(id: string): Promise<TimeLog | undefined> {
    const [updated] = await db.update(timeLogs)
      .set({ approved: true })
      .where(eq(timeLogs.id, id))
      .returning();
    return updated || undefined;
  }

  // Comments
  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  async getCommentsByTask(taskId: string): Promise<Comment[]> {
    return db.select().from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.createdAt);
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  // Project Invitations
  async createProjectInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation> {
    const [created] = await db.insert(projectInvitations).values(invitation).returning();
    return created;
  }

  async getProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
    return db.select().from(projectInvitations)
      .where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")))
      .orderBy(desc(projectInvitations.createdAt));
  }

  async getPendingInvitationsByEmail(email: string): Promise<ProjectInvitation[]> {
    return db.select().from(projectInvitations)
      .where(and(eq(projectInvitations.email, email.toLowerCase()), eq(projectInvitations.status, "pending")));
  }

  async deleteProjectInvitation(id: string): Promise<void> {
    await db.delete(projectInvitations).where(eq(projectInvitations.id, id));
  }

  // Dashboard Stats
  async getDashboardStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    totalTimeLogged: number;
    projectCount: number;
  }> {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = userProjects.map(p => p.id);
    
    if (projectIds.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalTimeLogged: 0,
        projectCount: 0,
      };
    }

    const allTasks = await db.select().from(tasks)
      .where(inArray(tasks.projectId, projectIds));

    const now = new Date();
    const overdueTasks = allTasks.filter(t => 
      t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
    ).length;

    const userTimeLogs = await this.getTimeLogsByUser(userId);
    const totalTimeLogged = userTimeLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

    return {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === "done").length,
      inProgressTasks: allTasks.filter(t => t.status === "in_progress").length,
      overdueTasks,
      totalTimeLogged,
      projectCount: userProjects.length,
    };
  }
}

export const storage = new DatabaseStorage();
