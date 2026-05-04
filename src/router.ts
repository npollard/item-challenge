import { createItemHandler } from './handlers/createItemHandler.js';
import { createVersionHandler } from './handlers/createVersionHandler.js';
import { getAuditTrailHandler } from './handlers/getAuditTrailHandler.js';
import { getItemHandler } from './handlers/getItemHandler.js';
import { listItemsHandler } from './handlers/listItemsHandler.js';
import { updateItemHandler } from './handlers/updateItemHandler.js';
import type { Logger } from './shared/logger.js';

interface RouteContext {
    method?: string;
    path?: string;
    body: unknown;
    query: Record<string, string>;
    logger: Logger;
}

export async function handleRoute(ctx: RouteContext) {
    const { method, path, body, query, logger } = ctx;

    if (!method || !path) {
        return notFound(logger, 'Missing method or path');
    }

    // Normalize path
    const parts = path.split('/').filter(Boolean);

    // POST /api/items
    if (method === 'POST' && path === '/api/items') {
        return createItemHandler(body, logger);
    }

    // GET /api/items
    if (method === 'GET' && path === '/api/items') {
        return listItemsHandler(query, logger);
    }

    // Routes under /api/items/:id
    if (parts[0] === 'api' && parts[1] === 'items' && parts[2]) {
        const id = parts[2];

        // GET /api/items/:id
        if (method === 'GET' && parts.length === 3) {
            return getItemHandler(id, logger);
        }

        // PUT /api/items/:id
        if (method === 'PUT' && parts.length === 3) {
            return updateItemHandler(id, body, logger);
        }

        // POST /api/items/:id/versions
        if (method === 'POST' && parts[3] === 'versions') {
            return createVersionHandler(id, logger);
        }

        // GET /api/items/:id/audit
        if (method === 'GET' && parts[3] === 'audit') {
            return getAuditTrailHandler(id, logger);
        }
    }

    return notFound(logger, 'Route not found');
}

function notFound(logger: Logger, message: string) {
    logger.warn(message);
    return {
        statusCode: 404,
        body: { error: 'Route not found' },
    };
}