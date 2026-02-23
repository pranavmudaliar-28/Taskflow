import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const requestId = crypto.randomUUID();

    // Log error with context
    logger.error(message, {
        status,
        requestId,
        method: req.method,
        path: req.path,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        user: (req as any).user?.id
    });

    if (res.headersSent) {
        return next(err);
    }

    res.status(status).json({
        success: false,
        message: process.env.NODE_ENV === 'production' && status === 500
            ? 'An unexpected error occurred'
            : message,
        code: err.code || 'INTERNAL_ERROR',
        requestId
    });
};
