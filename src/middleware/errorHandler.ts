import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/HttpError';

export default function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({
            message: err.message,
            ...err.details,
        });
        return;
    }

    console.error('[errorHandler]', err);
    res.status(500).json({ message: 'Internal server error' });
}
