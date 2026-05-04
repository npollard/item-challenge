import { handleRoute } from './router.js';
import { logger } from './shared/logger.js';
import type { ApiResponse } from './types/api.js';

// Lambda returns ApiResponse with body serialized to string
export async function handler(event: any): Promise<ApiResponse<string>> {
    const requestLogger = logger.child({
        requestId: event.requestContext?.requestId,
        method: event.requestContext?.http?.method,
        path: event.rawPath,
    });

    requestLogger.info('Incoming request');

    let body: unknown = null;

    try {
        body = event.body ? JSON.parse(event.body) : null;
    } catch (err) {
        requestLogger.warn({ err }, 'Invalid JSON body');

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON' }),
        };
    }

    const query = event.queryStringParameters || {};

    try {
        const result: ApiResponse = await handleRoute({
            method: event.requestContext?.http?.method,
            path: event.rawPath,
            body,
            query,
            logger: requestLogger,
        });

        return {
            statusCode: result.statusCode,
            body: JSON.stringify(result.body),
        };

    } catch (err) {
        requestLogger.error({ err }, 'Unhandled error');

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
}