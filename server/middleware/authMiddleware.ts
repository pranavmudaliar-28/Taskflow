import { NextFunction, Request, Response } from 'express';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { storage } from '../storage';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. Check for Bearer Token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            // 1. Verify token to ensure it isn't tampered with and hasn't expired
            const payload = TokenService.verifyToken(token);

            // 2. Check if token was explicitly revoked
            if (await TokenService.isTokenBlacklisted(token)) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has been invalidated',
                    code: 'LOGGED_OUT'
                });
            }

            // Verify user still exists in DB
            const user = await storage.getUser(payload.sub);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Populate request with user info
            (req as any).user = user;
            (req as any).tokenClaims = payload;
            return next();
        }

        // 2. Fallback to Session (for cookie-based auth)
        if (req.isAuthenticated && req.isAuthenticated()) {
            // User is already populated by passport/session middleware
            return next();
        }

        // 3. Unauthorized
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    } catch (error: any) {
        logger.warn('Authentication Failed', { error: error.message, path: req.path });
        return res.status(401).json({
            success: false,
            message: error.message || 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }
};
