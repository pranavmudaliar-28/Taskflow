import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many requests, please try again later.',
            retryAfter: Math.ceil((req as any).rateLimit?.resetTime ? ((req as any).rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
        });
    }
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
            retryAfter: Math.ceil((req as any).rateLimit?.resetTime ? ((req as any).rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
        });
    }
});

// Moderate rate limiter for organization invitations - 10 requests per hour
export const inviteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many invitation requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many invitation requests. Please try again in an hour.',
            retryAfter: Math.ceil((req as any).rateLimit?.resetTime ? ((req as any).rateLimit.resetTime.getTime() - Date.now()) / 1000 : 3600)
        });
    }
});

// Lenient rate limiter for read operations - 200 requests per 15 minutes
export const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
        // Skip rate limiting for GET requests to static assets
        return req.method === 'GET' && req.path.startsWith('/assets');
    }
});
