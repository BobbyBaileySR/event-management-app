/**
 * Local EMS dev server: serves the Frontend folder and proxies /api/ems → ScriptRunner.
 * Avoids browser CORS/OPTIONS issues (ScriptRunner does not handle OPTIONS).
 *
 * Usage: node dev-server.mjs   (or npm run dev)
 * Requires: dev-server.config.js (copy from dev-server.config.example.js)
 */
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const API_PREFIX = '/api/ems';
const FORWARD_HEADERS = ['authorization', 'content-type', 'x-ems-route', 'x-request-id'];

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

async function loadConfig() {
    const configPath = join(ROOT, 'dev-server.config.js');
    if (!existsSync(configPath)) {
        console.error(
            'Missing dev-server.config.js — copy dev-server.config.example.js and set srcListenerUrl.',
        );
        process.exit(1);
    }

    const module = await import(`file://${configPath}`);
    return module.DEV_SERVER_CONFIG;
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
        request.on('error', reject);
    });
}

function resolveStaticPath(urlPath) {
    const safePath = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const relative = safePath === '/' ? '/index.html' : safePath;
    const absolute = join(ROOT, relative);

    if (!absolute.startsWith(ROOT)) {
        return null;
    }

    return absolute;
}

function serveStaticFile(response, filePath) {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
    }

    const extension = extname(filePath);
    response.writeHead(200, { 'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream' });
    response.end(readFileSync(filePath));
}

async function proxyToScriptRunner(request, response, srcListenerUrl) {
    const headers = {};
    for (const name of FORWARD_HEADERS) {
        const value = request.headers[name];
        if (value) {
            headers[name] = value;
        }
    }

    const body =
        request.method === 'GET' || request.method === 'HEAD' ? undefined : await readRequestBody(request);

    let upstream;
    try {
        upstream = await fetch(srcListenerUrl, {
            method: request.method,
            headers,
            body,
        });
    } catch (error) {
        response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(
            JSON.stringify({
                message: 'Could not reach ScriptRunner listener',
                code: 'upstream_unreachable',
            }),
        );
        console.error('Upstream fetch failed:', error);
        return;
    }

    const responseHeaders = {};
    upstream.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    const responseBody = upstream.status === 204 ? null : Buffer.from(await upstream.arrayBuffer());

    response.writeHead(upstream.status, responseHeaders);
    response.end(responseBody);
}

const config = await loadConfig();

const server = http.createServer(async (request, response) => {
    const urlPath = request.url?.split('?')[0] ?? '/';

    if (urlPath === API_PREFIX || urlPath.startsWith(`${API_PREFIX}/`)) {
        await proxyToScriptRunner(request, response, config.srcListenerUrl);
        return;
    }

    const filePath = resolveStaticPath(urlPath);
    if (!filePath) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
    }

    serveStaticFile(response, filePath);
});

server.listen(config.port, config.host, () => {
    console.log(`Adaptavist EMS dev server: http://${config.host}:${config.port}`);
    console.log(`API proxy: ${API_PREFIX} → ScriptRunner (see dev-server.config.js)`);
    console.log('Press Ctrl+C to stop.');
});
