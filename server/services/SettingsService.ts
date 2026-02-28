import { storage } from "../storage";
import {
    type WorkspaceSettings, type UserSettings, type FeatureFlags,
    type NotificationPreferences, type ViewPreferences, type AutomationRule,
    type InsertViewPreferences, type InsertAutomationRule
} from "@shared/schema";
import { logger } from "../utils/logger";

export class SettingsService {
    /**
     * Workspace Settings
     */
    static async getWorkspaceSettings(orgId: string): Promise<WorkspaceSettings | undefined> {
        try {
            return await storage.getWorkspaceSettings(orgId);
        } catch (error) {
            logger.error(`Error getting workspace settings for org ${orgId}:`, error);
            throw error;
        }
    }

    static async updateWorkspaceSettings(orgId: string, updates: Partial<WorkspaceSettings>): Promise<WorkspaceSettings | undefined> {
        try {
            const settings = await storage.updateWorkspaceSettings(orgId, updates);
            logger.info(`Updated workspace settings for org ${orgId}`);
            return settings;
        } catch (error) {
            logger.error(`Error updating workspace settings for org ${orgId}:`, error);
            throw error;
        }
    }

    /**
     * Feature Flags (ClickApps)
     */
    static async getFeatureFlags(orgId: string): Promise<FeatureFlags | undefined> {
        try {
            return await storage.getFeatureFlags(orgId);
        } catch (error) {
            logger.error(`Error getting feature flags for org ${orgId}:`, error);
            throw error;
        }
    }

    static async updateFeatureFlags(orgId: string, updates: Partial<FeatureFlags>): Promise<FeatureFlags | undefined> {
        try {
            const flags = await storage.updateFeatureFlags(orgId, updates);
            logger.info(`Updated feature flags for org ${orgId}`);
            return flags;
        } catch (error) {
            logger.error(`Error updating feature flags for org ${orgId}:`, error);
            throw error;
        }
    }

    static async isFeatureEnabled(orgId: string, feature: keyof FeatureFlags): Promise<boolean> {
        const flags = await this.getFeatureFlags(orgId);
        if (!flags) return false;
        return !!flags[feature];
    }

    /**
     * User Settings
     */
    static async getUserSettings(userId: string): Promise<UserSettings | undefined> {
        try {
            return await storage.getUserSettings(userId);
        } catch (error) {
            logger.error(`Error getting user settings for user ${userId}:`, error);
            throw error;
        }
    }

    static async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | undefined> {
        try {
            const settings = await storage.updateUserSettings(userId, updates);
            logger.info(`Updated user settings for user ${userId}`);
            return settings;
        } catch (error) {
            logger.error(`Error updating user settings for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Notification Preferences
     */
    static async getNotificationPreferences(userId: string): Promise<NotificationPreferences[]> {
        try {
            return await storage.getNotificationPreferences(userId);
        } catch (error) {
            logger.error(`Error getting notification preferences for user ${userId}:`, error);
            throw error;
        }
    }

    static async updateNotificationPreference(
        userId: string,
        channel: string,
        updates: Partial<NotificationPreferences>
    ): Promise<NotificationPreferences | undefined> {
        try {
            return await storage.updateNotificationPreference(userId, channel, updates);
        } catch (error) {
            logger.error(`Error updating notification preference for user ${userId}, channel ${channel}:`, error);
            throw error;
        }
    }

    /**
     * View Preferences
     */
    static async getViewPreferences(userId: string, projectId?: string): Promise<ViewPreferences[]> {
        try {
            return await storage.getViewPreferences(userId, projectId);
        } catch (error) {
            logger.error(`Error getting view preferences for user ${userId}:`, error);
            throw error;
        }
    }

    static async saveViewPreference(pref: InsertViewPreferences): Promise<ViewPreferences> {
        try {
            return await storage.saveViewPreference(pref);
        } catch (error) {
            logger.error(`Error saving view preference for user ${pref.userId}:`, error);
            throw error;
        }
    }

    static async deleteViewPreference(id: string, userId: string): Promise<void> {
        try {
            await storage.deleteViewPreference(id, userId);
        } catch (error) {
            logger.error(`Error deleting view preference ${id}:`, error);
            throw error;
        }
    }

    /**
     * Automations
     */
    static async getAutomationRules(orgId: string, projectId?: string): Promise<AutomationRule[]> {
        try {
            return await storage.getAutomationRules(orgId, projectId);
        } catch (error) {
            logger.error(`Error getting automation rules for org ${orgId}:`, error);
            throw error;
        }
    }

    static async saveAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
        try {
            return await storage.saveAutomationRule(rule);
        } catch (error) {
            logger.error(`Error saving automation rule for org ${rule.organizationId}:`, error);
            throw error;
        }
    }

    static async deleteAutomationRule(id: string, orgId: string): Promise<void> {
        try {
            await storage.deleteAutomationRule(id, orgId);
        } catch (error) {
            logger.error(`Error deleting automation rule ${id}:`, error);
            throw error;
        }
    }
}
