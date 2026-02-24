import cors from 'cors';

const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://0.0.0.0:5000',
    'http://0.0.0.0:5001',
    'http://0.0.0.0:5002',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001',
    'http://127.0.0.1:5002',
    process.env.FRONTEND_URL?.replace(/\/$/, ''),
].filter(Boolean) as string[];

export const corsConfig = cors({
    origin: (origin, callback) => {
        // 1. Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
            return callback(null, true);
        }

        // 2. Allow if in explicit whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // 3. Allow if it's a Render subdomain (common for this project)
        if (origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }

        // 4. Fallback for development/internal testing if origin matches a local pattern
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Version'],
});
