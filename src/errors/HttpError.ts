export class HttpError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(404, message);
        this.name = 'NotFoundError';
    }
}

export class BadRequestError extends HttpError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(400, message, details);
        this.name = 'BadRequestError';
    }
}
