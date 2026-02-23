import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
    ),
    defaultMeta: { service: 'taskflow-backend' },
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'HH:mm:ss' }),
                customFormat
            ),
        }),
        new winston.transports.File({
            filename: 'logs/security.log',
            level: 'info',
            format: combine(timestamp(), json())
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), json())
        }),
    ],
});
