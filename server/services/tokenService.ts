import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback_secret_for_development_only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

export class TokenService {
    static generateToken(payload: TokenPayload): string {
        try {
            return jwt.sign(payload, JWT_SECRET, {
                expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
            });
        } catch (error) {
            logger.error('Error generating JWT', { error });
            throw new Error('Could not generate token');
        }
    }

    static verifyToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, JWT_SECRET) as TokenPayload;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('JWT Expired', { error });
                throw new Error('Token expired');
            }
            logger.warn('JWT Verification Failed', { error });
            throw new Error('Invalid token');
        }
    }

    static async invalidateToken(token: string) {
        if (!token) return;
        const decoded = this.decodeToken(token);
        if (decoded && decoded.exp) {
            const expiresAt = new Date(decoded.exp * 1000);
            await storage.revokeToken(token, expiresAt);
        }
    }

    static async isTokenBlacklisted(token: string): Promise<boolean> {
        return await storage.isTokenRevoked(token);
    }

    static decodeToken(token: string): TokenPayload | null {
        return jwt.decode(token) as TokenPayload | null;
    }
}
