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
    process.env.FRONTEND_URL,
    process.env.PORT ? `http://localhost:${process.env.PORT}` : null,
    process.env.PORT ? `http://0.0.0.0:${process.env.PORT}` : null,
    process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : null,
].filter(Boolean) as string[];

export const corsConfig = cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) if not in production
        // For enterprise security, we might want to restrict this further
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
