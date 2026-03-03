import mongoose, { Schema } from "mongoose";
import { z } from "zod";

// Schema definitions for Mongoose

const UserSchema = new Schema({
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    profileImageUrl: { type: String },
    role: { type: String, default: "member" },
    plan: { type: String, default: "free" },
    stripeCustomerId: { type: String },
    onboardingStep: { type: String, default: "plan" },
    seeded: { type: Boolean, default: false },
}, { timestamps: true });

// Transform _id to id for consistency with the rest of the app
UserSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const OrganizationSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    ownerId: { type: String, required: true },
}, { timestamps: true });

OrganizationSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const ProjectSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    description: { type: String },
    organizationId: { type: String, required: true },
    isPrivate: { type: Boolean, default: true },
}, { timestamps: true });

ProjectSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const TaskSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    projectId: { type: String, required: true },
    status: { type: String, default: "todo" },
    priority: { type: String, default: "medium" },
    assigneeId: { type: String },
    reviewerId: { type: String },
    testerId: { type: String },
    dueDate: { type: Date },
    startDate: { type: Date },
    deliveryRole: { type: String },
    milestoneId: { type: String },
    slug: { type: String, unique: true, sparse: true },
    order: { type: Number, default: 0 },
    parentId: { type: String },
}, { timestamps: true });

TaskSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const CommentSchema = new Schema({
    taskId: { type: String, required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    parentId: { type: String },
    reactions: { type: [String], default: [] },
    mentions: [{ type: String }],
}, { timestamps: true });

CommentSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const AttachmentSchema = new Schema({
    taskId: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number },
    type: { type: String },
    uploadedBy: { type: String, required: true },
}, { timestamps: true });

AttachmentSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const MilestoneSchema = new Schema({
    projectId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, default: "open" },
    dueDate: { type: Date },
}, { timestamps: true });

MilestoneSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const TimeLogSchema = new Schema({
    taskId: { type: String, required: true },
    userId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    approved: { type: Boolean, default: false },
}, { timestamps: true });

TimeLogSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const NotificationSchema = new Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedTaskId: { type: String },
    relatedProjectId: { type: String },
}, { timestamps: true });

NotificationSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const OrganizationMemberSchema = new Schema({
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, default: "member" },
}, { timestamps: true });

OrganizationMemberSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const ProjectMemberSchema = new Schema({
    projectId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, default: "member" },
}, { timestamps: true });

ProjectMemberSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const InvitationSchema = new Schema({
    organizationId: { type: String },
    projectId: { type: String },
    email: { type: String, required: true },
    role: { type: String, default: "member" },
    invitedBy: { type: String, required: true },
    status: { type: String, default: "pending" },
    token: { type: String },
    expiresAt: { type: Date },
}, { timestamps: true });

InvitationSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const PasswordResetTokenSchema = new Schema({
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

PasswordResetTokenSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const RevokedTokenSchema = new Schema({
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

RevokedTokenSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const FeatureFlagsSchema = new Schema({
    organizationId: { type: String, required: true, unique: true },
    timeTracking: { type: Boolean, default: false },
    priority: { type: Boolean, default: false },
    taskPriorities: { type: Boolean, default: false },
    milestones: { type: Boolean, default: false },
    tags: { type: Boolean, default: false },
    customFields: { type: Boolean, default: false },
    reminders: { type: Boolean, default: false },
    automations: { type: Boolean, default: false },
    reporting: { type: Boolean, default: false },
    multipleAssignees: { type: Boolean, default: false },
    sprintPoints: { type: Boolean, default: false },
    nestedSubtasks: { type: Boolean, default: false },
    dependencies: { type: Boolean, default: false },
}, { timestamps: true });

FeatureFlagsSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const WorkspaceSettingsSchema = new Schema({
    organizationId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    logoUrl: { type: String },
    primaryColor: { type: String },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    allowPublicProjects: { type: Boolean, default: true },
    defaultMemberRole: { type: String, default: "member" },
    defaultTaskStatuses: { type: [String], default: ["todo", "in_progress", "done"] },
}, { timestamps: true });

WorkspaceSettingsSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const UserSettingsSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },
    dateFormat: { type: String, default: "MMM d, yyyy" },
    timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },
    weekStart: { type: Number, enum: [0, 1, 6], default: 1 },
}, { timestamps: true });

UserSettingsSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const NotificationPreferenceSchema = new Schema({
    userId: { type: String, required: true },
    channel: { type: String, enum: ["email", "in_app", "push"], required: true },
    enabled: { type: Boolean, default: true },
    taskAssigned: { type: Boolean, default: true },
    statusChanged: { type: Boolean, default: true },
    mentioned: { type: Boolean, default: true },
    dueReminder: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false },
}, { timestamps: true });

NotificationPreferenceSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const ViewPreferenceSchema = new Schema({
    userId: { type: String, required: true },
    projectId: { type: String },
    viewType: { type: String, enum: ["list", "board", "calendar", "gantt"], default: "list" },
    filters: { type: Schema.Types.Mixed, default: {} },
    sortBy: { type: String, default: "createdAt" },
    sortOrder: { type: String, enum: ["asc", "desc"], default: "desc" },
    hiddenColumns: { type: [String], default: [] },
}, { timestamps: true });

ViewPreferenceSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

const AutomationRuleSchema = new Schema({
    organizationId: { type: String, required: true },
    projectId: { type: String },
    name: { type: String, required: true },
    trigger: { type: Schema.Types.Mixed, required: true },
    action: { type: Schema.Types.Mixed, required: true },
    enabled: { type: Boolean, default: true },
}, { timestamps: true });

AutomationRuleSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

// Models
export const UserMongo = mongoose.models.User || mongoose.model("User", UserSchema);
export const OrganizationMongo = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);
export const ProjectMongo = mongoose.models.Project || mongoose.model("Project", ProjectSchema);
export const TaskMongo = mongoose.models.Task || mongoose.model("Task", TaskSchema);
export const CommentMongo = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
export const AttachmentMongo = mongoose.models.Attachment || mongoose.model("Attachment", AttachmentSchema);
export const MilestoneMongo = mongoose.models.Milestone || mongoose.model("Milestone", MilestoneSchema);
export const TimeLogMongo = mongoose.models.TimeLog || mongoose.model("TimeLog", TimeLogSchema);
export const NotificationMongo = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
export const OrganizationMemberMongo = mongoose.models.OrganizationMember || mongoose.model("OrganizationMember", OrganizationMemberSchema);
export const ProjectMemberMongo = mongoose.models.ProjectMember || mongoose.model("ProjectMember", ProjectMemberSchema);
export const InvitationMongo = mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);
export const PasswordResetTokenMongo = mongoose.models.PasswordResetToken || mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
export const RevokedTokenMongo = mongoose.models.RevokedToken || mongoose.model("RevokedToken", RevokedTokenSchema);

export const FeatureFlagsMongo = mongoose.models.FeatureFlags || mongoose.model("FeatureFlags", FeatureFlagsSchema);
export const WorkspaceSettingsMongo = mongoose.models.WorkspaceSettings || mongoose.model("WorkspaceSettings", WorkspaceSettingsSchema);
export const UserSettingsMongo = mongoose.models.UserSettings || mongoose.model("UserSettings", UserSettingsSchema);
export const NotificationPreferencesMongo = mongoose.models.NotificationPreferences || mongoose.model("NotificationPreferences", NotificationPreferenceSchema);
export const ViewPreferencesMongo = mongoose.models.ViewPreferences || mongoose.model("ViewPreferences", ViewPreferenceSchema);
export const AutomationRuleMongo = mongoose.models.AutomationRule || mongoose.model("AutomationRule", AutomationRuleSchema);

// ─── CHAT SYSTEM ─────────────────────────────────────────────────────────────

const ChannelSchema = new Schema({
    name: { type: String },
    type: { type: String, enum: ["org", "project", "direct"], required: true },
    organizationId: { type: String, required: true },
    projectId: { type: String },
    createdBy: { type: String, required: true },
    memberIds: { type: [String], default: [] },
    // Canonical key for direct channels: sorted userId pair joined by ':'
    // Prevents duplicate DM channels between the same two users
    sortedMemberKey: { type: String, sparse: true },
    description: { type: String },
    isArchived: { type: Boolean, default: false },
}, { timestamps: true });

ChannelSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

// Compound unique index for DM deduplication (safeguard ④)
ChannelSchema.index({ type: 1, sortedMemberKey: 1 }, { unique: true, sparse: true });
// Index for fast member lookups
ChannelSchema.index({ organizationId: 1, type: 1 });
ChannelSchema.index({ memberIds: 1 });

const MessageSchema = new Schema({
    channelId: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, default: "" },
    attachments: [{
        name: { type: String },
        url: { type: String },
        size: { type: Number },
        mimeType: { type: String },
    }],
    voiceNoteUrl: { type: String },
    parentMessageId: { type: String },
    seenBy: { type: [String], default: [] },
    linkedTaskId: { type: String },
    reactions: [{ emoji: String, userId: String }],
    deletedAt: { type: Date },
    editedAt: { type: Date },
}, { timestamps: true });

MessageSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

// Text index for full-text message search (safeguard ⑧)
MessageSchema.index({ content: "text" });
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });

const ReactionSchema = new Schema({
    messageId: { type: String, required: true },
    userId: { type: String, required: true },
    emoji: { type: String, required: true },
}, { timestamps: true });

ReactionSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

// Unique — one reaction per emoji per user per message
ReactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });

const CallSchema = new Schema({
    type: { type: String, enum: ["voice", "video"], required: true },
    channelId: { type: String, required: true },
    startedBy: { type: String, required: true },
    participants: { type: [String], default: [] },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ["pending", "active", "ended", "rejected"], default: "pending" },
}, { timestamps: true });

CallSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

CallSchema.index({ channelId: 1, status: 1 });

const MeetingSchema = new Schema({
    channelId: { type: String, required: true },
    organizationId: { type: String, required: true },
    createdBy: { type: String, required: true },
    title: { type: String, required: true },
    participants: { type: [String], default: [] },
    // Private storage key (NOT a public URL) — signed URL generated on request
    recordingStorageKey: { type: String },
    transcriptUrl: { type: String },
    aiSummary: { type: String },
    keyDecisions: { type: [String], default: [] },
    actionPoints: { type: [String], default: [] },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    // Retention policy: set when recording is purged by cron job
    recordingExpiredAt: { type: Date },
    lastSummarizedAt: { type: Date },
    status: { type: String, enum: ["active", "ended"], default: "active" },
}, { timestamps: true });

MeetingSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

MeetingSchema.index({ channelId: 1, status: 1 });
MeetingSchema.index({ organizationId: 1 });

const AiSummarySchema = new Schema({
    channelId: { type: String, required: true },
    organizationId: { type: String, required: true },
    summary: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
    messageCount: { type: Number },
}, { timestamps: true });

AiSummarySchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

AiSummarySchema.index({ channelId: 1, generatedAt: -1 });

// ─── CHAT MODEL EXPORTS ───────────────────────────────────────────────────────
export const ChannelMongo = mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
export const MessageMongo = mongoose.models.Message || mongoose.model("Message", MessageSchema);
export const ReactionMongo = mongoose.models.Reaction || mongoose.model("Reaction", ReactionSchema);
export const CallMongo = mongoose.models.Call || mongoose.model("Call", CallSchema);
export const MeetingMongo = mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);
export const AiSummaryMongo = mongoose.models.AiSummary || mongoose.model("AiSummary", AiSummarySchema);

