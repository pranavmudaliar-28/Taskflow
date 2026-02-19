import type { Express, Router } from "express";

/**
 * API Versioning Middleware
 * 
 * This module provides utilities for API versioning to ensure backward compatibility
 * when making breaking changes to the API.
 * 
 * Current version: v1
 * 
 * Usage:
 * - All new routes should be added under /api/v1/
 * - Legacy routes without version prefix are aliased to v1 for backward compatibility
 * - Future versions (v2, v3) can be added without breaking existing clients
 */

/**
 * Creates a versioned router that can be mounted at /api/v1
 */
export function createVersionedRouter(): Router {
    const express = require('express');
    return express.Router();
}

/**
 * Adds backward compatibility aliases for routes
 * Maps /api/* to /api/v1/* for existing clients
 */
export function addLegacyAliases(app: Express, v1Router: Router) {
    // Mount v1 router at both /api/v1 and /api for backward compatibility
    app.use('/api/v1', v1Router);
    app.use('/api', v1Router); // Legacy support - redirects to v1
}

/**
 * Middleware to add API version header to responses
 */
export function addVersionHeader(version: string = 'v1') {
    return (req: any, res: any, next: any) => {
        res.setHeader('X-API-Version', version);
        next();
    };
}
