declare global {
    namespace Express {
        interface Request {
            user?: {
                userId?: string;
                id?: string;
                _id?: string;
                [key: string]: any;
            };
            file?: any;
            files?: any;
            cookies?: Record<string, string>;
            traceId?: string;
            app?: any;
        }
    }
}

export { };
