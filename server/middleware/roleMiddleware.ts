import { NextFunction, Request, Response } from 'express';

export const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Role check logic depends on how roles are assigned
        // If the token claims include role, or we fetch it from the DB user object
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
