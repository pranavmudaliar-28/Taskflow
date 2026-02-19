import { IStorage, ProjectMemberWithUser } from "./storage";
import {
    UserMongo, OrganizationMongo, ProjectMongo, TaskMongo,
    CommentMongo, AttachmentMongo, MilestoneMongo, TimeLogMongo,
    NotificationMongo, OrganizationMemberMongo, ProjectMemberMongo,
    InvitationMongo
} from "../shared/mongodb-schema";
import { generateSlug } from "./slug-utils";
import mongoose from "mongoose";
import {
    type User, type Organization, type Project, type Task,
    type Comment, type Attachment, type Milestone, type TimeLog,
    type Notification, type OrganizationMember, type ProjectMember,
    type ProjectInvitation, type OrganizationInvitation,
    type InsertOrganization, type InsertOrganizationMember,
    type InsertProject, type InsertProjectMember,
    type InsertTask, type InsertTimeLog, type InsertComment,
    type InsertAttachment, type InsertNotification,
    type InsertProjectInvitation, type InsertOrganizationInvitation,
    type InsertMilestone
} from "@shared/schema";

export class MongoStorage implements IStorage {
    // Helper to convert Mongoose doc to the expected shape
    private transform<T>(doc: any): T | undefined {
        if (!doc) return undefined;
        return doc.toJSON() as T;
    }

    private transformArray<T>(docs: any[]): T[] {
        return docs.map(doc => doc.toJSON() as T);
    }

    // Users
    async getUser(id: string): Promise<User | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<User>(await UserMongo.findById(id));
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return this.transform<User>(await UserMongo.findOne({ email }));
    }

    async getUsersByIds(ids: string[]): Promise<User[]> {
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        const users = await UserMongo.find({ _id: { $in: validIds } });
        return this.transformArray<User>(users);
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<User>(await UserMongo.findByIdAndUpdate(id, updates, { new: true }));
    }

    // Organizations
    async createOrganization(org: InsertOrganization): Promise<Organization> {
        const created = await OrganizationMongo.create(org);
        return this.transform<Organization>(created)!;
    }

    async getOrganization(id: string): Promise<Organization | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Organization>(await OrganizationMongo.findById(id));
    }

    async getOrganizationsByUser(userId: string): Promise<Organization[]> {
        const memberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = memberships.map(m => m.organizationId);
        const orgs = await OrganizationMongo.find({ _id: { $in: orgIds } });
        return this.transformArray<Organization>(orgs);
    }

    async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
        const created = await OrganizationMemberMongo.create(member);
        return this.transform<OrganizationMember>(created)!;
    }

    async getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
        const members = await OrganizationMemberMongo.find({ organizationId: orgId });
        return this.transformArray<OrganizationMember>(members);
    }

    async getOrganizationMembersForUser(userId: string, orgIds: string[]): Promise<OrganizationMember[]> {
        const members = await OrganizationMemberMongo.find({
            userId,
            organizationId: { $in: orgIds }
        });
        return this.transformArray<OrganizationMember>(members);
    }

    async isUserInOrganization(userId: string, orgId: string): Promise<boolean> {
        const member = await OrganizationMemberMongo.findOne({ userId, organizationId: orgId });
        return !!member;
    }

    async searchOrganizationMembers(userId: string, query: string): Promise<OrganizationMember[]> {
        const memberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = memberships.map(m => m.organizationId);

        const users = await UserMongo.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } }
            ]
        });

        const matchingUserIds = users.map(u => u._id.toString());
        const members = await OrganizationMemberMongo.find({
            organizationId: { $in: orgIds },
            userId: { $in: matchingUserIds }
        }).limit(50);

        return this.transformArray<OrganizationMember>(members);
    }

    // Projects
    async createProject(project: InsertProject): Promise<Project> {
        const created = await ProjectMongo.create(project);
        return this.transform<Project>(created)!;
    }

    async getProject(id: string): Promise<Project | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Project>(await ProjectMongo.findById(id));
    }

    async getProjectBySlug(slug: string): Promise<Project | undefined> {
        return this.transform<Project>(await ProjectMongo.findOne({ slug }));
    }

    async getProjectsByOrganization(orgId: string): Promise<Project[]> {
        const projects = await ProjectMongo.find({ organizationId: orgId });
        return this.transformArray<Project>(projects);
    }

    async getProjectsByUser(userId: string): Promise<Project[]> {
        const memberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = memberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } }).sort({ createdAt: -1 });
        return this.transformArray<Project>(projects);
    }

    async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Project>(await ProjectMongo.findByIdAndUpdate(id, updates, { new: true }));
    }

    async deleteProject(id: string): Promise<void> {
        await TaskMongo.deleteMany({ projectId: id });
        await ProjectMemberMongo.deleteMany({ projectId: id });
        await ProjectMongo.findByIdAndDelete(id);
    }

    async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
        const existing = await ProjectMemberMongo.findOne({
            projectId: member.projectId,
            userId: member.userId
        });
        if (existing) return this.transform<ProjectMember>(existing)!;
        const created = await ProjectMemberMongo.create(member);
        return this.transform<ProjectMember>(created)!;
    }

    async getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
        const members = await ProjectMemberMongo.find({ projectId });
        const userIds = members.map(m => m.userId);
        const users = await UserMongo.find({ _id: { $in: userIds } });
        const usersMap = new Map(users.map(u => [u._id.toString(), u]));

        return members.map(m => {
            const u = usersMap.get(m.userId);
            if (!u) return null;
            const userObj = this.transform<User>(u)!;
            const { password, ...userWithoutPassword } = userObj as any;
            return {
                ...this.transform<ProjectMember>(m),
                user: userWithoutPassword
            };
        }).filter(Boolean) as ProjectMemberWithUser[];
    }

    async getProjectMemberRole(userId: string, projectId: string): Promise<string | null> {
        const member = await ProjectMemberMongo.findOne({ userId, projectId });
        return member?.role || null;
    }

    async updateProjectMemberRole(userId: string, projectId: string, role: string): Promise<void> {
        await ProjectMemberMongo.updateOne({ userId, projectId }, { role });
    }

    async isUserInProject(userId: string, projectId: string): Promise<boolean> {
        const member = await ProjectMemberMongo.findOne({ userId, projectId });
        return !!member;
    }

    async isUserProjectMember(userId: string, projectId: string): Promise<boolean> {
        return this.isUserInProject(userId, projectId);
    }

    // Tasks
    async createTask(task: InsertTask): Promise<Task> {
        const slug = generateSlug(task.title);
        const created = await TaskMongo.create({ ...task, slug });
        return this.transform<Task>(created)!;
    }

    async getTask(id: string): Promise<Task | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Task>(await TaskMongo.findById(id));
    }

    async getTaskBySlug(slug: string): Promise<Task | undefined> {
        return this.transform<Task>(await TaskMongo.findOne({ slug }));
    }

    async getTasksByProject(projectId: string): Promise<Task[]> {
        const tasks = await TaskMongo.find({ projectId }).sort({ order: 1 });
        return this.transformArray<Task>(tasks);
    }

    async getTasksByUser(userId: string): Promise<Task[]> {
        const tasks = await TaskMongo.find({ assigneeId: userId }).sort({ createdAt: -1 });
        return this.transformArray<Task>(tasks);
    }

    async getRecentTasks(userId: string, limit = 10): Promise<Task[]> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const projectIds = projects.map(p => p._id.toString());

        const tasks = await TaskMongo.find({ projectId: { $in: projectIds } })
            .sort({ updatedAt: -1 })
            .limit(limit);
        return this.transformArray<Task>(tasks);
    }

    async getAllTasks(userId: string): Promise<Task[]> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const projectIds = projects.map(p => p._id.toString());

        const tasks = await TaskMongo.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 });
        return this.transformArray<Task>(tasks);
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Task>(await TaskMongo.findByIdAndUpdate(id, updates, { new: true }));
    }

    async deleteTask(id: string): Promise<void> {
        await TimeLogMongo.deleteMany({ taskId: id });
        await CommentMongo.deleteMany({ taskId: id });
        await TaskMongo.findByIdAndDelete(id);
    }

    async bulkUpdateTasks(userId: string, ids: string[], updates: Partial<Task>): Promise<Task[]> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const projectIds = projects.map(p => p._id.toString());

        await TaskMongo.updateMany(
            { _id: { $in: ids }, projectId: { $in: projectIds } },
            { $set: updates }
        );

        const updated = await TaskMongo.find({ _id: { $in: ids }, projectId: { $in: projectIds } });
        return this.transformArray<Task>(updated);
    }

    async bulkDeleteTasks(userId: string, ids: string[]): Promise<void> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const projectIds = projects.map(p => p._id.toString());

        await TaskMongo.deleteMany({ _id: { $in: ids }, projectId: { $in: projectIds } });
    }

    async reorderTasks(userId: string, items: { id: string; order: number }[]): Promise<void> {
        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { _id: item.id },
                update: { $set: { order: item.order } }
            }
        }));
        await TaskMongo.bulkWrite(bulkOps);
    }

    async canUserAccessTask(userId: string, taskId: string): Promise<boolean> {
        const task = await this.getTask(taskId);
        if (!task) return false;
        return this.isUserInProject(userId, task.projectId);
    }

    async searchTasks(userId: string, filters: any): Promise<{ tasks: Task[]; total: number }> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const accessibleProjects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const accessibleProjectIds = accessibleProjects.map(p => p._id.toString());

        let query: any = { projectId: { $in: accessibleProjectIds } };

        if (filters.status && filters.status.length > 0) {
            query.status = { $in: filters.status };
        }
        if (filters.priority && filters.priority.length > 0) {
            query.priority = { $in: filters.priority };
        }
        if (filters.assigneeId && filters.assigneeId.length > 0) {
            query.assigneeId = { $in: filters.assigneeId };
        }
        if (filters.projectId && filters.projectId.length > 0) {
            const filteredProjectIds = filters.projectId.filter((id: string) => accessibleProjectIds.includes(id));
            query.projectId = { $in: filteredProjectIds };
        }
        if (filters.parentId) {
            query.parentId = filters.parentId;
        }
        if (filters.search) {
            query.title = { $regex: filters.search, $options: 'i' };
        }
        if (filters.dueDateStart || filters.dueDateEnd) {
            query.dueDate = {};
            if (filters.dueDateStart) query.dueDate.$gte = filters.dueDateStart;
            if (filters.dueDateEnd) query.dueDate.$lte = filters.dueDateEnd;
        }

        const total = await TaskMongo.countDocuments(query);
        let taskQuery = TaskMongo.find(query);

        // Sorting
        const sortField = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
        taskQuery = taskQuery.sort({ [sortField]: sortOrder });

        if (filters.limit) taskQuery = taskQuery.limit(filters.limit);
        if (filters.offset) taskQuery = taskQuery.skip(filters.offset);

        const tasks = await taskQuery;
        return { tasks: this.transformArray<Task>(tasks), total };
    }

    // Time Logs
    async createTimeLog(log: InsertTimeLog): Promise<TimeLog> {
        const created = await TimeLogMongo.create(log);
        return this.transform<TimeLog>(created)!;
    }

    async getTimeLog(id: string): Promise<TimeLog | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<TimeLog>(await TimeLogMongo.findById(id));
    }

    async getActiveTimeLogs(userId: string): Promise<TimeLog[]> {
        const logs = await TimeLogMongo.find({ userId, endTime: { $exists: false } });
        return this.transformArray<TimeLog>(logs);
    }

    async stopTimeLog(id: string, endTime: Date): Promise<TimeLog | undefined> {
        const log = await TimeLogMongo.findById(id);
        if (!log) return undefined;

        const duration = Math.floor((endTime.getTime() - new Date(log.startTime).getTime()) / 1000);
        const updated = await TimeLogMongo.findByIdAndUpdate(id, { endTime, duration }, { new: true });
        return this.transform<TimeLog>(updated);
    }

    async getTimeLogsByUser(userId: string): Promise<TimeLog[]> {
        const logs = await TimeLogMongo.find({ userId }).sort({ startTime: -1 });
        return this.transformArray<TimeLog>(logs);
    }

    async getTimeLogsByTask(taskId: string): Promise<TimeLog[]> {
        const logs = await TimeLogMongo.find({ taskId }).sort({ startTime: -1 });
        return this.transformArray<TimeLog>(logs);
    }

    async getRecentTimeLogs(userId: string, limit = 10): Promise<TimeLog[]> {
        const logs = await TimeLogMongo.find({ userId }).sort({ startTime: -1 }).limit(limit);
        return this.transformArray<TimeLog>(logs);
    }

    async approveTimeLog(id: string): Promise<TimeLog | undefined> {
        const updated = await TimeLogMongo.findByIdAndUpdate(id, { approved: true }, { new: true });
        return this.transform<TimeLog>(updated);
    }

    // Comments
    async createComment(comment: InsertComment): Promise<Comment> {
        const created = await CommentMongo.create(comment);
        return this.transform<Comment>(created)!;
    }

    async getCommentsByTask(taskId: string): Promise<Comment[]> {
        const comments = await CommentMongo.find({ taskId }).sort({ createdAt: 1 });
        return this.transformArray<Comment>(comments);
    }

    // Attachments
    async getAttachmentsByTask(taskId: string): Promise<Attachment[]> {
        const attachments = await AttachmentMongo.find({ taskId }).sort({ createdAt: 1 });
        return this.transformArray<Attachment>(attachments);
    }

    async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
        const created = await AttachmentMongo.create(attachment);
        return this.transform<Attachment>(created)!;
    }

    async deleteAttachment(id: string): Promise<void> {
        await AttachmentMongo.findByIdAndDelete(id);
    }

    // Notifications
    async createNotification(notification: InsertNotification): Promise<Notification> {
        const created = await NotificationMongo.create(notification);
        return this.transform<Notification>(created)!;
    }

    async getNotificationsByUser(userId: string): Promise<Notification[]> {
        const notifications = await NotificationMongo.find({ userId }).sort({ createdAt: -1 });
        return this.transformArray<Notification>(notifications);
    }

    async markNotificationRead(id: string, userId: string): Promise<void> {
        await NotificationMongo.updateOne({ _id: id, userId }, { read: true });
    }

    async markAllNotificationsRead(userId: string): Promise<void> {
        await NotificationMongo.updateMany({ userId }, { read: true });
    }

    // Milestones
    async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
        const created = await MilestoneMongo.create(milestone);
        return this.transform<Milestone>(created)!;
    }

    async getMilestones(projectId: string): Promise<Milestone[]> {
        const milestones = await MilestoneMongo.find({ projectId });
        return this.transformArray<Milestone>(milestones);
    }

    async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone | undefined> {
        return this.transform<Milestone>(await MilestoneMongo.findByIdAndUpdate(id, updates, { new: true }));
    }

    async getMilestone(id: string): Promise<Milestone | undefined> {
        if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
        return this.transform<Milestone>(await MilestoneMongo.findById(id));
    }

    async getMilestonesByOrganization(orgId: string): Promise<Milestone[]> {
        const projects = await ProjectMongo.find({ organizationId: orgId });
        const projectIds = projects.map(p => p._id.toString());
        const milestones = await MilestoneMongo.find({ projectId: { $in: projectIds } });
        return this.transformArray<Milestone>(milestones);
    }

    // Invitations
    async createProjectInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation> {
        const created = await InvitationMongo.create(invitation);
        return this.transform<ProjectInvitation>(created)!;
    }

    async getProjectInvitation(token: string): Promise<ProjectInvitation | undefined> {
        return this.transform<ProjectInvitation>(await InvitationMongo.findOne({ token }));
    }

    async updateProjectInvitationStatus(id: string, status: string): Promise<void> {
        await InvitationMongo.findByIdAndUpdate(id, { status });
    }

    async deleteProjectInvitation(id: string): Promise<void> {
        await InvitationMongo.findByIdAndDelete(id);
    }

    async createOrganizationInvitation(invitation: InsertOrganizationInvitation): Promise<OrganizationInvitation> {
        const created = await InvitationMongo.create(invitation);
        return this.transform<OrganizationInvitation>(created)!;
    }

    async getOrganizationInvitation(token: string): Promise<OrganizationInvitation | undefined> {
        return this.transform<OrganizationInvitation>(await InvitationMongo.findOne({ token }));
    }

    async updateOrganizationInvitationStatus(id: string, status: string): Promise<void> {
        await InvitationMongo.findByIdAndUpdate(id, { status });
    }

    async deleteOrganizationInvitation(id: string): Promise<void> {
        await InvitationMongo.findByIdAndDelete(id);
    }

    async acceptOrganizationInvitation(token: string, userId: string): Promise<void> {
        const invite = await InvitationMongo.findOne({ token, status: "pending" });
        if (!invite) return;

        await OrganizationMemberMongo.create({
            organizationId: invite.organizationId,
            userId,
            role: invite.role
        });

        await InvitationMongo.findByIdAndUpdate(invite._id, { status: "accepted" });
    }

    async backfillOrganizationInvitations(orgId: string): Promise<void> {
        // Implementation for MongoDB if needed
    }

    async initializeUserWorkspace(userId: string): Promise<Organization> {
        const existing = await this.getOrganizationsByUser(userId);
        if (existing.length > 0) return existing[0];

        const user = await UserMongo.findById(userId);
        const orgName = user?.firstName ? `${user.firstName}'s Workspace` : "My Workspace";

        const org = await OrganizationMongo.create({
            name: orgName,
            ownerId: userId
        });

        await OrganizationMemberMongo.create({
            organizationId: org._id,
            userId,
            role: "admin"
        });

        return this.transform<Organization>(org)!;
    }

    async getDashboardStats(userId: string): Promise<{
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        overdueTasks: number;
        totalTimeLogged: number;
        projectCount: number;
    }> {
        const orgMemberships = await OrganizationMemberMongo.find({ userId });
        const orgIds = orgMemberships.map(m => m.organizationId);
        const projects = await ProjectMongo.find({ organizationId: { $in: orgIds } });
        const projectIds = projects.map(p => p._id.toString());

        const totalTasks = await TaskMongo.countDocuments({ projectId: { $in: projectIds } });
        const completedTasks = await TaskMongo.countDocuments({ projectId: { $in: projectIds }, status: "done" });
        const inProgressTasks = await TaskMongo.countDocuments({ projectId: { $in: projectIds }, status: "in_progress" });
        const overdueTasks = await TaskMongo.countDocuments({
            projectId: { $in: projectIds },
            status: { $ne: "done" },
            dueDate: { $lt: new Date() }
        });

        const timeLogs = await TimeLogMongo.find({ userId });
        const totalTimeLogged = timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            totalTimeLogged,
            projectCount: projects.length
        };
    }
}
