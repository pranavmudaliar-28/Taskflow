import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, pgEnum, AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import users table from auth models for references
import { users } from "./models/auth";

// Re-export auth models
export * from "./models/auth";

// Enums
export const roleEnum = pgEnum("role", ["admin", "team_lead", "member"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "in_review", "testing", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const notificationTypeEnum = pgEnum("notification_type", ["task_assigned", "status_changed", "mentioned", "due_reminder", "added_to_project"]);

// Organizations
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  address: text("address"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
}));

// Organization Members (many-to-many with roles)
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: roleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}));

// Projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull(),
  isPrivate: boolean("is_private").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
}));

// Project Members
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: roleEnum("role").notNull().default("member"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
}));

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").notNull(),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  assigneeId: varchar("assignee_id"),
  reviewerId: varchar("reviewer_id"),
  testerId: varchar("tester_id"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  deliveryRole: text("delivery_role"), // e.g. "Frontend", "Backend", "Fullstack", "Design", "QA", "Product", "DevOps"
  milestone: text("milestone"), // Keep for legacy/migration, prefer milestoneId
  milestoneId: varchar("milestone_id"),
  slug: text("slug").unique(),
  order: integer("order").default(0),
  parentId: varchar("parent_id").references((): AnyPgColumn => tasks.id), // Recursive self-reference for subtasks
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Milestones
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open, closed
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// Time Logs
export const timeLogs = pgTable("time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  userId: varchar("user_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [timeLogs.taskId],
    references: [tasks.id],
  }),
}));

// Comments
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  mentions: text("mentions").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
}));

// Attachments
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  type: text("type"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  timeLogs: many(timeLogs),
  comments: many(comments),
  attachments: many(attachments),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  relatedTaskId: varchar("related_task_id"),
  relatedProjectId: varchar("related_project_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Invitations (pending invites for unregistered users)
export const projectInvitations = pgTable("project_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("member"),
  invitedBy: varchar("invited_by").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization Invitations (invite users to organization first)
export const organizationInvitations = pgTable("organization_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("member"),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  dueDate: z.coerce.date().optional(), // Ensure date handling
  startDate: z.coerce.date().optional(),
  parentId: z.string().nullable().optional(),
});
export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, joinedAt: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, addedAt: true });
export const insertProjectInvitationSchema = createInsertSchema(projectInvitations).omit({ id: true, createdAt: true });
export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });

export const insertMilestoneSchema = createInsertSchema(milestones, {
  dueDate: z.coerce.date().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type InsertProjectInvitation = z.infer<typeof insertProjectInvitationSchema>;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = z.infer<typeof insertOrganizationInvitationSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

// Role type
export type Role = "admin" | "team_lead" | "member";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "testing" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
