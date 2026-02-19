import mongoose, { Schema } from "mongoose";
import { z } from "zod";

// Schema definitions for Mongoose

const UserSchema = new Schema({
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    profileImageUrl: { type: String },
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
