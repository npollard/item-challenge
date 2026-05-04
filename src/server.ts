/**
 * Local Development Server
 *
 * A simple HTTP server for testing your handlers locally.
 * Run with: pnpm dev
 */

import crypto from 'crypto';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { handleRoute } from './router.js';
import { logger } from './shared/logger.js';

const PORT = process.env.PORT || 3000;

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const { method, url } = req;

  const requestLogger = logger.child({
    requestId: crypto.randomUUID(),
    method,
    path: url,
  });

  // Parse request body
  let body = '';
  req.on('data', chunk => (body += chunk));
  await new Promise(resolve => req.on('end', resolve));

  let parsedBody: unknown = null;

  try {
    parsedBody = body ? JSON.parse(body) : null;
  } catch (err) {
    requestLogger.warn({ err }, 'Invalid JSON body');

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  // Parse query params
  const query = url
    ? Object.fromEntries(
      new URL(url, `http://${req.headers.host}`).searchParams.entries()
    )
    : {};

  requestLogger.info('Incoming request');

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const result = await handleRoute({
      method,
      path: url,
      body: parsedBody,
      query,
      logger: requestLogger,
    });

    res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.body));
  } catch (err) {
    requestLogger.error({ err }, 'Unhandled server error');

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  logger.info(
    { port: PORT, url: `http://localhost:${PORT}` },
    'Server started'
  );
});