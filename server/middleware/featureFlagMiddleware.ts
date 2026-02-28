import { Request, Response, NextFunction } from "express";
import { SettingsService } from "../services/SettingsService";
import { type FeatureFlags } from "@shared/schema";
import { storage } from "../storage";

export const checkFeature = (feature: keyof FeatureFlags) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }

            // Get user's organization
            const userOrgs = await storage.getOrganizationsByUser(userId);
            if (userOrgs.length === 0) {
                return res.status(403).json({ message: "No organization found" });
            }

            const orgId = userOrgs[0].id; // Assuming primary org for now
            const isEnabled = await SettingsService.isFeatureEnabled(orgId, feature).catch(err => {
                console.error(`[FeatureFlag] Backend error checking ${feature}:`, err);
                return false; // Fail safe (disabled)
            });

            if (!isEnabled) {
                return res.status(403).json({
                    message: `The '${feature}' feature is not enabled for this workspace.`,
                    code: "FEATURE_DISABLED",
                    feature
                });
            }

            next();
        } catch (error) {
            console.error(`[FeatureFlag] Critical failure checking ${feature}:`, error);
            res.status(403).json({
                message: "Feature availability could not be verified",
                code: "FEATURE_CHECK_FAILED",
                feature
            });
        }
    };
};
