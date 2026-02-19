import DOMPurify from 'isomorphic-dompurify';
import type { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string inputs to prevent XSS attacks
 */
function sanitizeString(value: string): string {
    // Remove any HTML tags and scripts
    return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // No HTML tags allowed in regular strings
        ALLOWED_ATTR: []
    });
}

/**
 * Sanitize HTML content (for rich text fields)
 */
export function sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
    });
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // if (req.query) {
    //     const sanitized = sanitizeObject(req.query);
    //     Object.keys(sanitized).forEach(key => {
    //         (req.query as any)[key] = sanitized[key];
    //     });
    // }

    // if (req.params) {
    //     const sanitized = sanitizeObject(req.params);
    //     Object.keys(sanitized).forEach(key => {
    //         (req.params as any)[key] = sanitized[key];
    //     });
    // }

    next();
}

/**
 * Middleware specifically for endpoints that accept HTML content
 * Use this for rich text fields like task descriptions, comments, etc.
 */
export function sanitizeHTMLInput(fields: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.body && typeof req.body === 'object') {
            for (const field of fields) {
                if (req.body[field] && typeof req.body[field] === 'string') {
                    req.body[field] = sanitizeHTML(req.body[field]);
                }
            }
        }
        next();
    };
}
