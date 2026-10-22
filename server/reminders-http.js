import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from './reminders-core.js';

export function header(req, name) {
    const value = req.headers?.[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value ?? '';
}

export async function readBody(req, limit = 65_536, raw = false) {
    if (req.rawBody !== undefined) {
        const value = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
        if (value.length > limit) throw new ApiError(413, 'Request is too large.');
        return value.toString('utf8');
    }
    if (req[Symbol.asyncIterator]) {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
            const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += value.length;
            if (size > limit) throw new ApiError(413, 'Request is too large.');
            chunks.push(value);
        }
        if (size || req.body === undefined) return Buffer.concat(chunks).toString('utf8');
    }
    if (raw && typeof req.body !== 'string' && !Buffer.isBuffer(req.body)) throw new ApiError(400, 'The original delivery body is required.');
    const body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body ?? null);
    if (Buffer.byteLength(body) > limit) throw new ApiError(413, 'Request is too large.');
    return body;
}

function jsonBody(raw) {
    try { return JSON.parse(raw); } catch { throw new ApiError(400, 'Invalid JSON request.'); }
}

export function send(res, status, body, extras = {}) {
    res.statusCode = status;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const [key, value] of Object.entries(extras)) res.setHeader(key, value);
    res.end(JSON.stringify(body));
}

function fail(res, error) {
    const known = error instanceof ApiError;
    send(res, known ? error.status : 503, { ok: false, error: known ? error.message : 'Reminder service is temporarily unavailable. Please retry.', code: known ? error.code : 'temporarily_unavailable' }, known && error.status === 503 ? { 'Retry-After': '30' } : {});
}

export function createRemindersHandler(service) {
    return async (req, res) => {
        try {
            const method = req.method ?? 'GET';
            if (method === 'GET') {
                const ip = header(req, 'x-vercel-forwarded-for') || header(req, 'x-forwarded-for').split(',')[0] || req.socket?.remoteAddress || 'unknown';
                if (service.config.configured && !await service.rateLimit(`reads:${ip}`, 120, 60)) throw new ApiError(429, 'Too many requests. Please try again shortly.', 'rate_limited');
                return send(res, 200, await service.status(header(req, 'cookie')));
            }
            if (!['POST', 'PUT', 'DELETE'].includes(method)) return send(res, 405, { ok: false, error: 'Method not allowed.' }, { Allow: 'GET, POST, PUT, DELETE' });
            if (!service.config.configured) throw new ApiError(503, 'Background reminders are not configured yet.', 'not_configured');
            if (header(req, 'origin') !== service.config.origin || (header(req, 'sec-fetch-site') && header(req, 'sec-fetch-site') !== 'same-origin')) throw new ApiError(403, 'Only same-origin requests are allowed.', 'invalid_origin');
            if (!/^application\/json(?:\s*;|$)/i.test(header(req, 'content-type'))) throw new ApiError(415, 'Send a JSON request.');
            const ip = header(req, 'x-vercel-forwarded-for') || header(req, 'x-forwarded-for').split(',')[0] || req.socket?.remoteAddress || 'unknown';
            if (!await service.rateLimit(`mutations:${ip}`, 60, 60)) throw new ApiError(429, 'Too many updates. Please try again shortly.', 'rate_limited');
            if (method === 'POST' && !await service.rateLimit(`registration:${ip}`, 20, 86400)) throw new ApiError(429, 'Too many notification registrations. Please try again later.', 'rate_limited');
            const result = await service.snapshot({ method, cookie: header(req, 'cookie'), body: jsonBody(await readBody(req)) });
            return send(res, 200, result.body, { 'Set-Cookie': result.cookie });
        } catch (error) { return fail(res, error); }
    };
}

export function createDeliveryHandler(service) {
    return async (req, res) => {
        try {
            if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' }, { Allow: 'POST' });
            const signature = header(req, 'upstash-signature');
            if (!signature || signature.length > 4096) throw new ApiError(401, 'Invalid delivery signature.', 'invalid_signature');
            return send(res, 200, await service.deliver(await readBody(req, 4096, true), signature, header(req, 'upstash-region')));
        } catch (error) { return fail(res, error); }
    };
}

// A Web Request preserves the exact signed bytes; Node helpers may parse req.body.
export function createDeliveryFetchHandler(service) {
    return async (request) => {
        const responseHeaders = new Headers();
        let status = 200;
        let body;
        const res = {
            set statusCode(value) { status = value; },
            setHeader(name, value) { responseHeaders.set(name, value); },
            end(value) { body = value; },
        };
        try {
            let size = 0;
            const chunks = [];
            if (request.body) {
                const reader = request.body.getReader();
                try {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        size += value.byteLength;
                        if (size > 4096) {
                            await reader.cancel();
                            throw new ApiError(413, 'Request is too large.');
                        }
                        chunks.push(Buffer.from(value));
                    }
                } finally { reader.releaseLock(); }
            }
            await createDeliveryHandler(service)({
                method: request.method,
                headers: Object.fromEntries(request.headers),
                rawBody: Buffer.concat(chunks),
            }, res);
        } catch (error) { fail(res, error); }
        return new Response(body, { status, headers: responseHeaders });
    };
}

export function createMaintenanceHandler(service) {
    return async (req, res) => {
        try {
            if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed.' }, { Allow: 'GET' });
            const expected = `Bearer ${service.config.cronSecret}`;
            const actual = header(req, 'authorization');
            if (!service.config.cronSecret || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) throw new ApiError(401, 'Invalid maintenance authorization.');
            return send(res, 200, await service.maintenance());
        } catch (error) { return fail(res, error); }
    };
}
