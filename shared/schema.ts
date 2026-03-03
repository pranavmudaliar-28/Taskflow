import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Common Enums used in validation
export const RoleEnum = z.enum(["admin", "team_lead", "member", "owner"]);
export const TaskStatusEnum = z.enum(["todo", "in_progress", "in_review", "testing", "done"]);
export const TaskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const NotificationTypeEnum = z.enum(["task_assigned", "status_changed", "mentioned", "due_reminder", "added_to_project"]);

// Organizations
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required"),
  email: z.string().email().optional().nullable(),
  ownerId: z.string(),
  accentColor: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertOrganizationSchema = organizationSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Organization Members
export const organizationMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: RoleEnum.default("member"),
  joinedAt: z.date().optional(),
});
export const insertOrganizationMemberSchema = organizationMemberSchema.omit({ id: true, joinedAt: true });

// Projects
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Project name is required"),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  isPrivate: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertProjectSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Project Members
export const projectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: RoleEnum.default("member"),
  addedAt: z.date().optional(),
});
export const insertProjectMemberSchema = projectMemberSchema.omit({ id: true, addedAt: true });

// Tasks
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional().nullable(),
  projectId: z.string(),
  status: TaskStatusEnum.default("todo"),
  priority: TaskPriorityEnum.default("medium"),
  assigneeId: z.string().optional().nullable(),
  reviewerId: z.string().optional().nullable(),
  testerId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  deliveryRole: z.string().optional().nullable(),
  milestone: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  order: z.number().default(0),
  parentId: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertTaskSchema = taskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Milestones
export const milestoneSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1, "Milestone title is required"),
  description: z.string().optional().nullable(),
  status: z.string().default("open"),
  dueDate: z.coerce.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertMilestoneSchema = milestoneSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Time Logs
export const timeLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional().nullable(),
  duration: z.number().optional().nullable(),
  approved: z.boolean().default(false),
  createdAt: z.date().optional(),
});
export const insertTimeLogSchema = timeLogSchema.omit({ id: true, createdAt: true });

// Comments
export const commentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  authorId: z.string(),
  content: z.string().min(1, "Comment content cannot be empty"),
  parentId: z.string().optional().nullable(),
  reactions: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertCommentSchema = commentSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Attachments
export const attachmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string(),
  url: z.string().url(),
  size: z.number().optional().nullable(),
  type: z.string().optional().nullable(),
  uploadedBy: z.string(),
  createdAt: z.date().optional(),
});
export const insertAttachmentSchema = attachmentSchema.omit({ id: true, createdAt: true });

// Notifications
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeEnum,
  title: z.string(),
  message: z.string(),
  read: z.boolean().default(false),
  relatedTaskId: z.string().optional().nullable(),
  relatedProjectId: z.string().optional().nullable(),
  createdAt: z.date().optional(),
});
export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true });

// Project Invitations
export const projectInvitationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  role: RoleEnum.default("member"),
  invitedBy: z.string(),
  status: z.string().default("pending"),
  createdAt: z.date().optional(),
});
export const insertProjectInvitationSchema = projectInvitationSchema.omit({ id: true, createdAt: true });

// Organization Invitations
export const organizationInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  role: RoleEnum.default("member"),
  invitedBy: z.string(),
  token: z.string(),
  status: z.string().default("pending"),
  createdAt: z.date().optional(),
  expiresAt: z.coerce.date(),
});
export const insertOrganizationInvitationSchema = organizationInvitationSchema.omit({ id: true, createdAt: true });

// Types Base
export type Role = z.infer<typeof RoleEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export type Organization = z.infer<typeof organizationSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TimeLog = z.infer<typeof timeLogSchema>;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectInvitation = z.infer<typeof projectInvitationSchema>;
export type InsertProjectInvitation = z.infer<typeof insertProjectInvitationSchema>;
export type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>;
export type InsertOrganizationInvitation = z.infer<typeof insertOrganizationInvitationSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export interface FeatureFlags {
  organizationId: string;
  timeTracking: boolean;
  priority: boolean;
  taskPriorities?: boolean;
  milestones: boolean;
  tags: boolean;
  customFields: boolean;
  reminders: boolean;
  automations: boolean;
  reporting: boolean;
  multipleAssignees?: boolean;
  sprintPoints?: boolean;
  nestedSubtasks?: boolean;
  dependencies?: boolean;
}

export interface WorkspaceSettings {
  organizationId: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  theme: "light" | "dark" | "system";
  allowPublicProjects: boolean;
  defaultMemberRole: Role;
  defaultTaskStatuses?: string[];
}

export interface UserSettings {
  userId: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStart: 0 | 1 | 6; // Sun, Mon, Sat
}

export interface NotificationPreferences {
  channel: "email" | "in_app" | "push";
  enabled?: boolean;
  taskAssigned: boolean;
  statusChanged: boolean;
  mentioned: boolean;
  dueReminder: boolean;
  dailyDigest: boolean;
}

export interface ViewPreferences {
  id: string;
  userId: string;
  projectId?: string;
  viewType: "list" | "board" | "calendar" | "gantt";
  filters: any;
  sortBy: string;
  sortOrder: "asc" | "desc";
  hiddenColumns: string[];
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  trigger: any;
  action: any;
  enabled: boolean;
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface InsertViewPreferences extends Omit<ViewPreferences, "id"> { }
export interface InsertAutomationRule extends Omit<AutomationRule, "id"> { }

// ─── CHAT SYSTEM SCHEMAS ──────────────────────────────────────────────────────

export const ChannelTypeEnum = z.enum(["org", "project", "direct"]);

export const channelSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  type: ChannelTypeEnum,
  organizationId: z.string(),
  projectId: z.string().optional().nullable(),
  createdBy: z.string(),
  memberIds: z.array(z.string()).default([]),
  sortedMemberKey: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isArchived: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertChannelSchema = channelSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Channel = z.infer<typeof channelSchema>;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export const messageAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
});

export const messageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  senderId: z.string(),
  content: z.string().default(""),
  attachments: z.array(messageAttachmentSchema).default([]),
  voiceNoteUrl: z.string().optional().nullable(),
  parentMessageId: z.string().optional().nullable(),
  seenBy: z.array(z.string()).default([]),
  linkedTaskId: z.string().optional().nullable(),
  reactions: z.array(z.object({ emoji: z.string(), userId: z.string() })).default([]),
  deletedAt: z.date().optional().nullable(),
  editedAt: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertMessageSchema = messageSchema.omit({ id: true, createdAt: true, updatedAt: true, seenBy: true, reactions: true, deletedAt: true, editedAt: true });
export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageAttachment = z.infer<typeof messageAttachmentSchema>;

export const reactionSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  userId: z.string(),
  emoji: z.string(),
  createdAt: z.date().optional(),
});
export const insertReactionSchema = reactionSchema.omit({ id: true, createdAt: true });
export type Reaction = z.infer<typeof reactionSchema>;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

export const CallTypeEnum = z.enum(["voice", "video"]);
export const CallStatusEnum = z.enum(["pending", "active", "ended", "rejected"]);

export const callSchema = z.object({
  id: z.string(),
  type: CallTypeEnum,
  channelId: z.string(),
  startedBy: z.string(),
  participants: z.array(z.string()).default([]),
  startedAt: z.date().optional(),
  endedAt: z.date().optional().nullable(),
  status: CallStatusEnum.default("pending"),
  createdAt: z.date().optional(),
});
export const insertCallSchema = callSchema.omit({ id: true, createdAt: true });
export type Call = z.infer<typeof callSchema>;
export type InsertCall = z.infer<typeof insertCallSchema>;

export const meetingSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  createdBy: z.string(),
  title: z.string(),
  participants: z.array(z.string()).default([]),
  // Private storage key — signed URL generated on demand, never exposed directly
  recordingStorageKey: z.string().optional().nullable(),
  transcriptUrl: z.string().optional().nullable(),
  aiSummary: z.string().optional().nullable(),
  keyDecisions: z.array(z.string()).default([]),
  actionPoints: z.array(z.string()).default([]),
  startedAt: z.date().optional(),
  endedAt: z.date().optional().nullable(),
  recordingExpiredAt: z.date().optional().nullable(),
  lastSummarizedAt: z.date().optional().nullable(),
  status: z.enum(["active", "ended"]).default("active"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const insertMeetingSchema = meetingSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Meeting = z.infer<typeof meetingSchema>;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

export const aiSummarySchema = z.object({
  id: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  summary: z.string(),
  generatedAt: z.date().optional(),
  messageCount: z.number().optional(),
  createdAt: z.date().optional(),
});
export type AiSummary = z.infer<typeof aiSummarySchema>;
