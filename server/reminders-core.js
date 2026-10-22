import { Buffer } from 'node:buffer';
import { createHash, ECDH, randomBytes } from 'node:crypto';

export const COOKIE_NAME = '__Host-dreamie-reminders';
export const HORIZON_MS = 6 * 24 * 60 * 60 * 1000;
export const DELIVERY_GRACE_MS = 180_000;
export const CLAIM_MS = 30_000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);

export class ApiError extends Error {
    constructor(status, message, code = 'request_failed') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export function deviceFromCookie(cookie = '') {
    const value = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    return value && /^[\w-]{43}$/.test(value) ? { token: value, id: hash(value) } : null;
}

export function sessionCookie(token) {
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`;
}

export function validateSubscription(value) {
    if (!value || typeof value !== 'object' || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) {
        throw new ApiError(400, 'A valid push subscription is required.', 'invalid_subscription');
    }
    let endpoint;
    try { endpoint = new URL(value.endpoint); } catch { throw new ApiError(400, 'Invalid push endpoint.', 'invalid_subscription'); }
    const hostname = endpoint.hostname.toLowerCase();
    const allowed = hostname === 'fcm.googleapis.com' || hostname === 'updates.push.services.mozilla.com' ||
        /^(?:[a-z0-9-]+\.)*push\.apple\.com$/.test(hostname) || /^(?:[a-z0-9-]+\.)+notify\.windows\.com$/.test(hostname);
    if (endpoint.protocol !== 'https:' || !allowed || endpoint.username || endpoint.password || endpoint.hash ||
        (endpoint.port && endpoint.port !== '443') || value.endpoint.trim() !== value.endpoint) {
        throw new ApiError(400, 'This push provider is not supported.', 'invalid_subscription');
    }
    const keys = value.keys;
    if (!keys || !/^[A-Za-z0-9_-]{87}$/.test(keys.p256dh ?? '') || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth ?? '')) {
        throw new ApiError(400, 'Invalid push encryption keys.', 'invalid_subscription');
    }
    try {
        const key = Buffer.from(keys.p256dh, 'base64url');
        if (key.length !== 65 || key[0] !== 4 || Buffer.from(keys.auth, 'base64url').length !== 16) throw new Error('key');
        ECDH.convertKey(key, 'prime256v1');
    } catch { throw new ApiError(400, 'Invalid push encryption keys.', 'invalid_subscription'); }
    return { endpoint: endpoint.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function validateRevision(revision) {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new ApiError(400, 'A valid sync revision is required.', 'invalid_revision');
    return revision;
}

export function validateSnapshot(body) {
    if (!body || typeof body !== 'object') throw new ApiError(400, 'Invalid reminder snapshot.');
    validateRevision(body.revision);
    const subscription = validateSubscription(body.subscription);
    if (!Array.isArray(body.reminders) || body.reminders.length > 100) throw new ApiError(400, 'A device can have at most 100 active reminders.');
    const ids = new Set();
    const reminders = body.reminders.map(item => {
        if (!item || typeof item.taskId !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(item.taskId) || ['__proto__', 'constructor', 'prototype'].includes(item.taskId) || ids.has(item.taskId) ||
            typeof item.revision !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(item.revision) ||
            typeof item.taskTitle !== 'string' || item.taskTitle.length > 10_000 ||
            ![0, 15, 60, 1440].includes(item.offsetMinutes) || typeof item.dueAt !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(item.dueAt)) {
            throw new ApiError(400, 'Invalid task reminder.', 'invalid_reminder');
        }
        const dueAt = Date.parse(item.dueAt);
        const [year, month, day, hour, minute, second] = item.dueAt.match(/^\d{4}|\d{2}/g).slice(0, 6).map(Number);
        const calendar = new Date(Date.UTC(year, month - 1, day));
        if (!Number.isFinite(dueAt) || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new ApiError(400, 'Invalid due date.', 'invalid_reminder');
        ids.add(item.taskId);
        return {
            taskId: item.taskId,
            revision: item.revision,
            dueAt: new Date(dueAt).toISOString(),
            offsetMinutes: item.offsetMinutes,
            taskTitle: item.taskTitle.trim().slice(0, 200),
            reminderAt: dueAt - item.offsetMinutes * 60_000,
        };
    }).sort((a, b) => a.taskId.localeCompare(b.taskId));
    return { revision: body.revision, subscription, reminders };
}

export function maintenanceScore(record, now) {
    const dates = record.pendingCancels.map(item => item.retryAt ?? now);
    for (const job of Object.values(record.jobs)) {
        if (job.state === 'pending') dates.push(Math.max(job.retryAt ?? now, job.reminderAt - HORIZON_MS));
        if (job.state === 'publishing') dates.push(job.leaseUntil);
        if (job.state === 'queued' || job.state === 'sending') dates.push(job.reminderAt + DELIVERY_GRACE_MS + 1);
    }
    return dates.length ? Math.min(...dates) : null;
}

export function createReminderService({ store, queue, notify, verifySignature, config, now = Date.now, token = () => randomBytes(32).toString('base64url') }) {
    const callbackUrl = `${config.origin}/api/reminder-delivery`;
    const requireConfigured = () => {
        if (!config.configured) throw new ApiError(503, 'Background reminders are not configured yet.', 'not_configured');
    };

    async function change(id, update) {
        for (let attempt = 0; attempt < 12; attempt++) {
            const current = await store.getDevice(id);
            const next = update(current ? clone(current) : null);
            if (next === null) return current;
            const version = current?.version ?? -1;
            next.version = version + 1;
            next.updatedAt = now();
            next.maintenanceAt = maintenanceScore(next, now());
            next.expiresAt = Math.max(now() + YEAR_MS, ...Object.values(next.jobs).map(job => job.reminderAt + 7 * 86400_000));
            const saved = await store.compareAndSetDevice(id, version, next);
            if (saved === 'owned') throw new ApiError(409, 'This subscription belongs to another browser session. Unsubscribe in this browser, then enable notifications again.', 'subscription_owned');
            if (saved) return next;
        }
        throw new ApiError(409, 'Reminders changed at the same time. Please retry.', 'conflict');
    }

    const appendCancel = (record, messageId, expiresAt) => {
        if (!messageId || record.pendingCancels.some(item => item.messageId === messageId)) return;
        record.pendingCancels.push({ messageId, expiresAt: expiresAt + DELIVERY_GRACE_MS, retryAt: now() });
        // Old callbacks still fail the authoritative eventId check if queue cancellation cannot finish.
        record.pendingCancels = record.pendingCancels.slice(-1000);
    };

    async function processDevice(id) {
        let record = await store.getDevice(id);
        if (!record) { await store.removeDueDevice?.(id); return false; }
        for (const pending of record.pendingCancels.slice(0, 100)) {
            if (pending.retryAt > now()) continue;
            let done = pending.expiresAt < now();
            if (!done) {
                try { await queue.cancel(pending.messageId); done = true; }
                catch (error) { done = error.status === 404 || error.statusCode === 404; }
            }
            await change(id, current => {
                if (!current) return null;
                current.pendingCancels = current.pendingCancels.flatMap(item => item.messageId !== pending.messageId ? [item] : done ? [] : [{ ...item, retryAt: now() + 60_000 }]);
                return current;
            });
        }
        record = await store.getDevice(id);
        for (const original of Object.values(record.jobs)) {
            if (original.reminderAt + DELIVERY_GRACE_MS < now() && !['sent', 'expired', 'failed'].includes(original.state)) {
                await change(id, current => {
                    const job = current?.jobs[original.taskId];
                    if (!job || job.eventId !== original.eventId || job.state === 'sent') return null;
                    appendCancel(current, job.messageId, job.reminderAt);
                    job.state = 'expired';
                    return current;
                });
                continue;
            }
            if (original.reminderAt > now() + HORIZON_MS || (original.retryAt ?? 0) > now() ||
                !(original.state === 'pending' || (original.state === 'publishing' && original.leaseUntil <= now()))) continue;
            const publishToken = token();
            let claimed = false;
            await change(id, current => {
                claimed = false;
                const job = current?.jobs[original.taskId];
                if (!current?.subscribed || !job || job.eventId !== original.eventId ||
                    !(job.state === 'pending' || (job.state === 'publishing' && job.leaseUntil <= now()))) return null;
                job.state = 'publishing'; job.publishToken = publishToken; job.leaseUntil = now() + CLAIM_MS;
                claimed = true;
                return current;
            });
            if (!claimed) continue;
            try {
                const published = await queue.publish({
                    url: callbackUrl,
                    body: { deviceId: id, taskId: original.taskId, eventId: original.eventId },
                    notBefore: Math.max(Math.ceil(now() / 1000), Math.ceil(original.reminderAt / 1000)),
                    deduplicationId: original.eventId,
                    retries: 3,
                });
                await change(id, current => {
                    if (!current) return null;
                    const job = current.jobs[original.taskId];
                    if (!current.subscribed || !job || job.eventId !== original.eventId || job.publishToken !== publishToken) {
                        appendCancel(current, published.messageId, original.reminderAt);
                    } else {
                        // Delivery may already have completed before the publish acknowledgement arrives.
                        if (job.state === 'publishing') job.state = 'queued';
                        job.messageId = published.messageId; job.leaseUntil = 0;
                    }
                    return current;
                });
            } catch {
                await change(id, current => {
                    const job = current?.jobs[original.taskId];
                    if (!job || job.eventId !== original.eventId || job.publishToken !== publishToken || job.state !== 'publishing') return null;
                    job.state = 'pending'; job.retryAt = now() + 60_000; job.leaseUntil = 0;
                    return current;
                });
            }
        }
        const latest = await store.getDevice(id);
        return Boolean(latest?.pendingCancels.length || Object.values(latest?.jobs ?? {}).some(job => ['pending', 'publishing'].includes(job.state) && job.reminderAt <= now() + HORIZON_MS));
    }

    async function status(cookie) {
        if (!config.configured) return { configured: false, publicKey: null, subscribed: false, revision: 0 };
        const session = deviceFromCookie(cookie);
        const record = session ? await store.getDevice(session.id) : null;
        return { configured: true, publicKey: config.publicKey, subscribed: Boolean(record?.subscribed), revision: record?.revision ?? 0 };
    }

    async function snapshot({ method, cookie, body }) {
        requireConfigured();
        const input = method === 'DELETE' ? { revision: validateRevision(body?.revision) } : validateSnapshot(body);
        let session = deviceFromCookie(cookie);
        let existing = session ? await store.getDevice(session.id) : null;
        if (method !== 'POST' && !existing) throw new ApiError(401, 'Enable notifications on this device first.', 'not_subscribed');
        if (!existing) { const value = token(); session = { token: value, id: hash(value) }; }
        const digest = method === 'DELETE' ? hash('unsubscribed') : hash(JSON.stringify({ subscription: input.subscription, reminders: input.reminders }));
        await change(session.id, current => {
            if (current && input.revision < current.revision) throw new ApiError(409, 'A newer reminder update has already been saved.', 'stale_revision');
            if (current && input.revision === current.revision) {
                if (digest !== current.digest) throw new ApiError(409, 'This revision was already used for a different update.', 'stale_revision');
                return null;
            }
            if (method === 'PUT' && !current?.subscribed) throw new ApiError(401, 'Enable notifications on this device again first.', 'not_subscribed');
            const record = current ?? { version: -1, jobs: {}, pendingCancels: [] };
            const oldJobs = record.jobs;
            record.jobs = {};
            record.revision = input.revision; record.digest = digest;
            record.subscribed = method !== 'DELETE'; record.subscription = input.subscription ?? null;
            record.endpointHash = input.subscription ? hash(input.subscription.endpoint) : null;
            for (const item of input.reminders ?? []) {
                const fingerprint = hash(JSON.stringify({ taskId: item.taskId, revision: item.revision, dueAt: item.dueAt, offsetMinutes: item.offsetMinutes }));
                const previous = oldJobs[item.taskId];
                if (previous && previous.fingerprint === fingerprint) record.jobs[item.taskId] = { ...previous, taskTitle: item.taskTitle };
                else {
                    record.jobs[item.taskId] = { ...item, fingerprint, eventId: hash(`${session.id}:${input.revision}:${item.taskId}:${fingerprint}`), state: item.reminderAt < now() ? 'expired' : 'pending' };
                }
            }
            for (const previous of Object.values(oldJobs)) {
                if (record.jobs[previous.taskId]?.eventId !== previous.eventId) appendCancel(record, previous.messageId, previous.reminderAt);
            }
            return record;
        });
        const pending = await processDevice(session.id);
        existing = await store.getDevice(session.id);
        return { body: { ok: true, revision: existing.revision, ...(pending ? { pending: true } : {}) }, cookie: sessionCookie(session.token) };
    }

    async function deliver(rawBody, signature, region) {
        requireConfigured();
        let verified = false;
        try { verified = await verifySignature({ body: rawBody, signature, url: callbackUrl, upstashRegion: region }); } catch { /* Invalid signatures never reach storage. */ }
        if (!verified) throw new ApiError(401, 'Invalid delivery signature.', 'invalid_signature');
        let input;
        try { input = JSON.parse(rawBody); } catch { throw new ApiError(400, 'Invalid delivery payload.'); }
        if (!/^[a-f0-9]{64}$/.test(input.deviceId ?? '') || !/^[a-f0-9]{64}$/.test(input.eventId ?? '') || typeof input.taskId !== 'string') throw new ApiError(400, 'Invalid delivery payload.');
        const claimToken = token();
        let claimed = null;
        await change(input.deviceId, record => {
            claimed = null;
            const job = record?.jobs[input.taskId];
            if (!record?.subscribed || !job || job.eventId !== input.eventId || ['sent', 'expired', 'failed'].includes(job.state)) return null;
            if (now() < job.reminderAt) throw new ApiError(503, 'Reminder is not due yet.', 'not_due');
            if (now() > job.reminderAt + DELIVERY_GRACE_MS) { job.state = 'expired'; return record; }
            if (job.state === 'sending' && job.leaseUntil > now()) throw new ApiError(503, 'Reminder delivery is already in progress.', 'in_progress');
            job.state = 'sending'; job.claimToken = claimToken; job.leaseUntil = now() + CLAIM_MS;
            claimed = { subscription: record.subscription, job: clone(job) };
            return record;
        });
        if (!claimed) return { ok: true, skipped: true };
        const latest = await store.getDevice(input.deviceId);
        if (!latest?.subscribed || latest.jobs[input.taskId]?.claimToken !== claimToken || latest.jobs[input.taskId]?.eventId !== input.eventId) return { ok: true, skipped: true };
        let failure = null;
        try {
            await notify(claimed.subscription, {
                title: 'Dreamie To-Dos ♡',
                body: 'A task reminder is ready. Open Dreamie to view it.',
                taskId: claimed.job.taskId,
                revision: claimed.job.revision,
                taskTitle: claimed.job.taskTitle,
                reminderAt: new Date(claimed.job.reminderAt).toISOString(),
                eventId: claimed.job.eventId,
                tag: `dreamie-reminder-${claimed.job.eventId}`,
            }, { TTL: Math.max(1, Math.ceil((claimed.job.reminderAt + DELIVERY_GRACE_MS - now()) / 1000)), topic: Buffer.from(input.eventId, 'hex').toString('base64url').slice(0, 32), urgency: 'high' });
        } catch (error) { failure = error; }
        await change(input.deviceId, record => {
            const job = record?.jobs[input.taskId];
            if (!job || job.eventId !== input.eventId || job.claimToken !== claimToken) return null;
            if (failure && [404, 410].includes(failure.statusCode)) {
                for (const other of Object.values(record.jobs)) appendCancel(record, other.messageId, other.reminderAt);
                record.subscribed = false; record.subscription = null; record.endpointHash = null; record.jobs = {};
            } else {
                const permanent = failure && failure.statusCode >= 400 && failure.statusCode < 500 && failure.statusCode !== 429;
                job.state = failure ? (permanent ? 'failed' : 'queued') : 'sent';
                job.leaseUntil = 0; job.claimToken = null;
                if (!failure) job.sentAt = now();
            }
            return record;
        });
        if (failure && !(failure.statusCode >= 400 && failure.statusCode < 500 && failure.statusCode !== 429)) throw new ApiError(503, 'Push delivery will be retried.', 'push_retry');
        return { ok: true, ...(failure ? { unavailable: true } : {}) };
    }

    async function maintenance() {
        requireConfigured();
        const ids = await store.listDueDevices(now(), 200);
        let pending = 0;
        for (const id of ids) if (await processDevice(id)) pending++;
        return { ok: true, processed: ids.length, pending };
    }

    return { status, snapshot, deliver, maintenance, processDevice, config, rateLimit: (key, limit, seconds) => store.rateLimit(hash(key), limit, seconds) };
}
