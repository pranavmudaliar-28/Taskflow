import { NextFunction, Request, Response } from 'express';
import { storage } from '../storage';

export const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = (req as any).tokenClaims?.role || user.role || 'member';

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

export const authorizeOrg = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const orgId = String(req.params.id || req.params.orgId || '');
        if (!orgId) {
            return res.status(400).json({ message: 'Organization ID is required for this action' });
        }

        try {
            const members = await storage.getOrganizationMembers(orgId);
            const member = members.find((m: any) => m.userId === user.id || m.userId === user._id?.toString());

            if (!member || !allowedRoles.includes(member.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions in this organization.',
                    code: 'FORBIDDEN_ORG'
                });
            }

            next();
        } catch (error) {
            console.error('AuthorizeOrg Error:', error);
            res.status(500).json({ message: 'Internal server error during authorization' });
        }
    };
};
