import { NextFunction, Request, Response } from 'express';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { storage } from '../storage';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Missing or malformed authorization header',
                code: 'AUTH_REQUIRED'
            });
        }

        const token = authHeader.split(' ')[1];
        const payload = TokenService.verifyToken(token);

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

        next();
    } catch (error: any) {
        logger.warn('Authentication Failed', { error: error.message, path: req.path });
        return res.status(401).json({
            success: false,
            message: error.message || 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }
};
