import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createECDH, createHmac, createHash } from 'node:crypto';
import { Receiver } from '@upstash/qstash';
import { createReminderService, deviceFromCookie, validateSnapshot, validateSubscription, COOKIE_NAME, DELIVERY_GRACE_MS, HORIZON_MS } from '../server/reminders-core.js';
import { createDeliveryFetchHandler, createMaintenanceHandler, createRemindersHandler } from '../server/reminders-http.js';
import { readConfiguration } from '../server/reminders-runtime.js';

const BASE_TIME = Date.parse('2026-10-21T12:00:00.000Z');
const clone = value => structuredClone(value);
const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
const subscription = (name = 'one') => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 7).toString('base64url') } });
const reminder = (patch = {}) => ({ taskId: 'task-1', revision: 'task-revision-1', taskTitle: 'A cozy task', dueAt: new Date(BASE_TIME + 60_000).toISOString(), offsetMinutes: 0, ...patch });
const snapshot = (revision = 1, reminders = [reminder()], endpoint = 'one') => ({ revision, subscription: subscription(endpoint), reminders });

class MemoryStore {
    devices = new Map();
    owners = new Map();
    reads = 0;
    limits = new Map();
    allowed = true;
    async getDevice(id) { this.reads++; return clone(this.devices.get(id) ?? null); }
    async compareAndSetDevice(id, expected, next) {
        if ((this.devices.get(id)?.version ?? -1) !== expected) return false;
        if (next.endpointHash && this.owners.has(next.endpointHash) && this.owners.get(next.endpointHash) !== id) return 'owned';
        if (next.endpointHash) this.owners.set(next.endpointHash, id);
        this.devices.set(id, clone(next));
        return true;
    }
    async listDueDevices(now, limit) { return [...this.devices].filter(([, record]) => record.maintenanceAt !== null && record.maintenanceAt <= now).sort((a, b) => a[1].maintenanceAt - b[1].maintenanceAt).slice(0, limit).map(([id]) => id); }
    async rateLimit(key) { this.limits.set(key, (this.limits.get(key) ?? 0) + 1); return this.allowed; }
}

function fixture(existingStore) {
    const store = existingStore ?? new MemoryStore();
    const clock = { value: BASE_TIME };
    const published = [], canceled = [], notifications = [], signatures = [];
    const behavior = { publishFails: false, cancelFails: false, pushError: null, beforePublishReturn: null, beforeNotifyReturn: null };
    let sequence = 0;
    const options = {
        store, now: () => clock.value,
        token: () => Buffer.from(String(++sequence).padStart(32, '0')).toString('base64url'),
        config: { configured: true, origin: 'https://dreamie.example', publicKey: 'public-key', cronSecret: 'test-cron-secret' },
        queue: {
            async publish(input) {
                if (behavior.publishFails) throw new Error('queue unavailable');
                published.push(clone(input));
                if (behavior.beforePublishReturn) await behavior.beforePublishReturn(input);
                return { messageId: `message-${published.length}` };
            },
            async cancel(id) { canceled.push(id); if (behavior.cancelFails) throw new Error('cancel unavailable'); },
        },
        async verifySignature(input) { signatures.push(input); return input.signature === 'valid'; },
        async notify(sub, payload, pushOptions) {
            notifications.push({ subscription: clone(sub), payload: clone(payload), options: clone(pushOptions) });
            if (behavior.beforeNotifyReturn) await behavior.beforeNotifyReturn();
            if (behavior.pushError) throw behavior.pushError;
        },
    };
    const service = createReminderService(options);
    return { store, clock, published, canceled, notifications, signatures, behavior, options, service };
}

async function register(f, body = snapshot()) {
    const result = await f.service.snapshot({ method: 'POST', body });
    const cookie = result.cookie.split(';')[0];
    const id = deviceFromCookie(cookie).id;
    return { ...result, cookie, id, record: await f.store.getDevice(id) };
}
const callback = (f, index = 0) => JSON.stringify(f.published[index].body);
const errorCode = (code, status) => error => error.code === code && (!status || error.status === status);
function nodeResponse() {
    return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.raw = value; this.body = JSON.parse(value); } };
}
async function request(handler, method, body, extraHeaders = {}) {
    const res = nodeResponse();
    await handler({ method, headers: { origin: 'https://dreamie.example', 'content-type': 'application/json', ...extraHeaders }, body, socket: { remoteAddress: '192.0.2.1' } }, res);
    return res;
}

test('configuration is opt-in and incomplete configuration stays disabled', async () => {
    assert.equal(readConfiguration({}).configured, false);
    const f = fixture();
    const disabled = createReminderService({ ...f.options, config: { configured: false, origin: '' } });
    assert.deepEqual(await disabled.status(), { configured: false, publicKey: null, subscribed: false, revision: 0 });
    assert.equal(f.store.reads, 0);
    await assert.rejects(disabled.snapshot({ method: 'POST', body: snapshot() }), errorCode('not_configured', 503));
});

test('push endpoint validation blocks arbitrary URLs and invalid encryption keys', () => {
    for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.example/x', 'https://fcm.googleapis.com:8443/x', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com/x#secret', ' https://fcm.googleapis.com/x']) {
        assert.throws(() => validateSubscription({ ...subscription(), endpoint }), errorCode('invalid_subscription'));
    }
    for (const endpoint of ['https://updates.push.services.mozilla.com/wpush/v2/a', 'https://web.push.apple.com/a', 'https://wns2-bl2p.notify.windows.com/a']) assert.equal(validateSubscription({ ...subscription(), endpoint }).endpoint, endpoint);
    assert.throws(() => validateSubscription({ ...subscription(), keys: { p256dh: 'A'.repeat(87), auth: 'a'.repeat(22) } }), errorCode('invalid_subscription'));
});

test('snapshots reject invalid dates, duplicate IDs, prototype keys and oversized lists', () => {
    for (const value of [snapshot(1, [reminder({ dueAt: '2026-02-30T12:00:00Z' })]), snapshot(1, [reminder(), reminder()]), snapshot(1, [reminder({ taskId: '__proto__' })]), snapshot(1, Array.from({ length: 101 }, (_, i) => reminder({ taskId: `task-${i}` })))]) assert.throws(() => validateSnapshot(value));
    assert.throws(() => validateSnapshot(snapshot(Number.MAX_SAFE_INTEGER + 1)), errorCode('invalid_revision'));
    assert.equal(validateSnapshot(snapshot(1, [reminder({ taskTitle: 'x'.repeat(500) })])).reminders[0].taskTitle.length, 200);
});

test('anonymous registration stores a hash and secure cookie without account data', async () => {
    const f = fixture();
    const result = await register(f);
    assert.match(result.cookie, new RegExp(`^${COOKIE_NAME}=[A-Za-z0-9_-]{43}$`));
    assert.match(result.body.ok.toString(), /true/);
    const raw = await f.service.snapshot({ method: 'PUT', cookie: result.cookie, body: snapshot(2) });
    assert.match(raw.cookie, /Path=\/; HttpOnly; Secure; SameSite=Strict/);
    assert.equal(result.id.length, 64);
    assert.equal(JSON.stringify(result.record).includes(result.cookie.split('=')[1]), false);
    assert.equal(f.published.length, 1);
    assert.deepEqual(Object.keys(f.published[0].body).sort(), ['deviceId', 'eventId', 'taskId']);
    assert.equal((await f.service.status(result.cookie)).revision, 2);
});

test('monotonic revisions reject stale or conflicting updates and replay identically', async () => {
    const f = fixture();
    const { cookie } = await register(f, snapshot(10));
    await assert.rejects(f.service.snapshot({ method: 'PUT', cookie, body: snapshot(9, []) }), errorCode('stale_revision', 409));
    await assert.rejects(f.service.snapshot({ method: 'PUT', cookie, body: snapshot(10, []) }), errorCode('stale_revision', 409));
    await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(10) });
    assert.equal(f.published.length, 1);
    await assert.rejects(f.service.snapshot({ method: 'PUT', body: snapshot(11) }), errorCode('not_subscribed', 401));
});

test('empty full snapshot cancels removed or permanently deleted reminders before delivery', async () => {
    const f = fixture();
    const { cookie, id } = await register(f);
    const oldCallback = callback(f);
    f.behavior.cancelFails = true;
    const result = await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(2, []) });
    assert.equal(result.body.pending, true);
    assert.deepEqual((await f.store.getDevice(id)).jobs, {});
    assert.equal(JSON.stringify(await f.store.getDevice(id)).includes('A cozy task'), false);
    f.clock.value += 60_000;
    assert.equal((await f.service.deliver(oldCallback, 'valid')).skipped, true);
    assert.equal(f.notifications.length, 0);
    f.behavior.cancelFails = false;
    await f.service.maintenance();
    assert.equal((await f.store.getDevice(id)).pendingCancels.length, 0);
    assert.equal(f.canceled.length, 2);
});

test('unsubscribe is isolated per device and its tombstone blocks stale re-enabling', async () => {
    const f = fixture();
    const first = await register(f, snapshot(1, [reminder()], 'one'));
    const second = await register(f, snapshot(1, [reminder()], 'two'));
    await f.service.snapshot({ method: 'DELETE', cookie: first.cookie, body: { revision: 3 } });
    assert.equal((await f.service.status(first.cookie)).subscribed, false);
    assert.equal((await f.service.status(first.cookie)).revision, 3);
    assert.equal((await f.service.status(second.cookie)).subscribed, true);
    assert.deepEqual(f.canceled, ['message-1']);
    await assert.rejects(f.service.snapshot({ method: 'PUT', cookie: first.cookie, body: snapshot(2) }), errorCode('stale_revision', 409));
    await assert.rejects(f.service.snapshot({ method: 'PUT', cookie: first.cookie, body: snapshot(4) }), errorCode('not_subscribed', 401));
    await f.service.snapshot({ method: 'POST', cookie: first.cookie, body: snapshot(4) });
    assert.equal((await f.service.status(first.cookie)).subscribed, true);
    await assert.rejects(f.service.snapshot({ method: 'POST', body: snapshot(1) }), errorCode('subscription_owned', 409));
});

test('concurrent update and later unsubscribe preserve the highest revision', async () => {
    const f = fixture();
    const { cookie } = await register(f);
    const results = await Promise.allSettled([
        f.service.snapshot({ method: 'PUT', cookie, body: snapshot(2) }),
        f.service.snapshot({ method: 'DELETE', cookie, body: { revision: 3 } }),
    ]);
    assert.equal(results[1].status, 'fulfilled');
    assert.deepEqual(await f.service.status(cookie), { configured: true, publicKey: 'public-key', subscribed: false, revision: 3 });
});

test('durable outbox retries failed scheduling after a function restart', async () => {
    const f = fixture();
    f.behavior.publishFails = true;
    const { id, body } = await register(f, snapshot(1, [reminder({ dueAt: new Date(BASE_TIME + 3600_000).toISOString() })]));
    assert.equal(body.pending, true);
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].state, 'pending');
    f.behavior.publishFails = false;
    f.clock.value += 61_000;
    const restarted = createReminderService(f.options);
    assert.equal((await restarted.maintenance()).processed, 1);
    assert.equal(f.published.length, 1);
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].state, 'queued');
});

test('far-future reminders enter the six-day scheduling horizon during maintenance', async () => {
    const f = fixture();
    const due = BASE_TIME + HORIZON_MS + 2 * 86400_000;
    await register(f, snapshot(1, [reminder({ dueAt: new Date(due).toISOString() })]));
    assert.equal(f.published.length, 0);
    f.clock.value += 2 * 86400_000;
    await f.service.maintenance();
    assert.equal(f.published.length, 1);
    assert.equal(f.published[0].notBefore, Math.ceil(due / 1000));
});

test('newly restored or rescheduled past reminders expire, unchanged just-due jobs remain deliverable', async () => {
    const f = fixture();
    const original = reminder();
    const { cookie, id } = await register(f, snapshot(1, [original]));
    const eventId = f.published[0].body.eventId;
    f.clock.value += 90_000;
    await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(2, [{ ...original, taskTitle: 'Renamed after due' }]) });
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].eventId, eventId);
    await f.service.deliver(callback(f), 'valid');
    assert.equal(f.notifications.length, 1);
    assert.equal(f.notifications[0].payload.taskTitle, 'Renamed after due');
    await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(3, [reminder({ revision: 'restored-revision' })]) });
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].state, 'expired');
    assert.equal(f.published.length, 1);
    const fresh = fixture();
    const past = await register(fresh, snapshot(1, [reminder({ dueAt: new Date(BASE_TIME - 1000).toISOString() })]));
    assert.equal(past.record.jobs['task-1'].state, 'expired');
    assert.equal(fresh.published.length, 0);
});

test('delivery enforces due time and short expiry, with invalid signatures denied before storage', async () => {
    const f = fixture();
    await register(f);
    const reads = f.store.reads;
    await assert.rejects(f.service.deliver(callback(f), 'forged'), errorCode('invalid_signature', 401));
    assert.equal(f.store.reads, reads);
    await assert.rejects(f.service.deliver(callback(f), 'valid'), errorCode('not_due', 503));
    f.clock.value += 60_000 + DELIVERY_GRACE_MS + 1;
    assert.equal((await f.service.deliver(callback(f), 'valid')).skipped, true);
    assert.equal(f.notifications.length, 0);
});

test('duplicates deliver once and payload includes required versioned fields and stable tag', async () => {
    const f = fixture();
    await register(f);
    f.clock.value += 60_000;
    await f.service.deliver(callback(f), 'valid');
    await f.service.deliver(callback(f), 'valid');
    assert.equal(f.notifications.length, 1);
    const { payload, options } = f.notifications[0];
    assert.deepEqual([payload.taskId, payload.revision, payload.taskTitle, payload.reminderAt], ['task-1', 'task-revision-1', 'A cozy task', new Date(BASE_TIME + 60_000).toISOString()]);
    assert.equal(payload.tag, `dreamie-reminder-${payload.eventId}`);
    assert.equal(options.TTL, 180);
    assert.equal(options.topic.length, 32);
});

test('simultaneous callbacks use an atomic delivery claim', async () => {
    const f = fixture();
    await register(f);
    f.clock.value += 60_000;
    let release, entered;
    const waiting = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    f.behavior.beforeNotifyReturn = () => { entered(); return waiting; };
    const first = f.service.deliver(callback(f), 'valid');
    await started;
    await assert.rejects(f.service.deliver(callback(f), 'valid'), errorCode('in_progress', 503));
    release();
    await first;
    assert.equal((await f.service.deliver(callback(f), 'valid')).skipped, true);
    assert.equal(f.notifications.length, 1);
});

test('a callback before queue acknowledgement never overwrites a sent state', async () => {
    const f = fixture();
    f.behavior.beforePublishReturn = async input => { f.clock.value += 60_000; await f.service.deliver(JSON.stringify(input.body), 'valid'); };
    const { id } = await register(f);
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].state, 'sent');
    assert.equal((await f.service.deliver(callback(f), 'valid')).skipped, true);
    assert.equal(f.notifications.length, 1);
});

test('deleting while a queue publish is in flight cancels its late acknowledgement', async () => {
    const f = fixture();
    let cookie;
    f.behavior.beforePublishReturn = async input => {
        const record = await f.store.getDevice(input.body.deviceId);
        const token = Buffer.from('1'.padStart(32, '0')).toString('base64url');
        cookie = `${COOKIE_NAME}=${token}`;
        assert.equal(record.jobs['task-1'].state, 'publishing');
        await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(2, []) });
    };
    const result = await register(f);
    assert.equal(result.body.revision, 2);
    assert.deepEqual((await f.store.getDevice(result.id)).jobs, {});
    assert.equal((await f.store.getDevice(result.id)).pendingCancels.length, 1);
    f.clock.value += 60_000;
    assert.equal((await f.service.deliver(callback(f), 'valid')).skipped, true);
    await f.service.maintenance();
    assert.deepEqual(f.canceled, ['message-1']);
    assert.equal(f.notifications.length, 0);
});

test('a cancellation between delivery claim and the final check prevents push', async () => {
    const f = fixture();
    const { cookie, id } = await register(f);
    f.clock.value += 60_000;
    const originalGet = f.store.getDevice.bind(f.store);
    let triggered = false;
    f.store.getDevice = async requestedId => {
        const value = await originalGet(requestedId);
        if (!triggered && requestedId === id && value?.jobs['task-1']?.state === 'sending') {
            triggered = true;
            await f.service.snapshot({ method: 'PUT', cookie, body: snapshot(2, []) });
            return originalGet(requestedId);
        }
        return value;
    };
    assert.equal((await f.service.deliver(callback(f), 'valid')).skipped, true);
    assert.equal(triggered, true);
    assert.equal(f.notifications.length, 0);
});

test('provider transient errors retry while expired subscriptions stop all this-device jobs', async () => {
    const f = fixture();
    const { id, cookie } = await register(f);
    f.clock.value += 60_000;
    f.behavior.pushError = { statusCode: 500 };
    await assert.rejects(f.service.deliver(callback(f), 'valid'), errorCode('push_retry', 503));
    assert.equal((await f.store.getDevice(id)).jobs['task-1'].state, 'queued');
    f.behavior.pushError = { statusCode: 410 };
    await f.service.deliver(callback(f), 'valid');
    assert.equal((await f.service.status(cookie)).subscribed, false);
    assert.deepEqual((await f.store.getDevice(id)).jobs, {});
});

test('Web Request callback preserves noncanonical signed JSON bytes and rejects oversized input', async () => {
    const f = fixture();
    await register(f);
    f.clock.value += 60_000;
    const raw = `\n  ${JSON.stringify(f.published[0].body, null, 2)}\n`;
    const handler = createDeliveryFetchHandler(f.service);
    const response = await handler(new Request('https://dreamie.example/api/reminder-delivery', { method: 'POST', headers: { 'upstash-signature': 'valid' }, body: raw }));
    assert.equal(response.status, 200);
    assert.equal(f.signatures.at(-1).body, raw);
    const oversized = await handler(new Request('https://dreamie.example/api/reminder-delivery', { method: 'POST', headers: { 'upstash-signature': 'valid' }, body: 'a'.repeat(4097) }));
    assert.equal(oversized.status, 413);
    const invalid = await handler(new Request('https://dreamie.example/api/reminder-delivery', { method: 'POST', headers: { 'upstash-signature': 'bad' }, body: raw }));
    assert.equal(invalid.status, 401);
});

test('API enforces same-origin JSON mutations, rate limits, size limits and cron authorization', async () => {
    const f = fixture();
    const handler = createRemindersHandler(f.service);
    assert.equal((await request(handler, 'POST', snapshot(), { origin: 'https://evil.example' })).statusCode, 403);
    assert.equal((await request(handler, 'POST', snapshot(), { 'sec-fetch-site': 'cross-site' })).statusCode, 403);
    assert.equal((await request(handler, 'POST', snapshot(), { 'content-type': 'text/plain' })).statusCode, 415);
    assert.equal((await request(handler, 'POST', 'x'.repeat(65_537))).statusCode, 413);
    f.store.allowed = false;
    assert.equal((await request(handler, 'POST', snapshot())).statusCode, 429);
    f.store.allowed = true;
    const maintenance = createMaintenanceHandler(f.service);
    assert.equal((await request(maintenance, 'GET')).statusCode, 401);
    assert.equal((await request(maintenance, 'GET', undefined, { authorization: 'Bearer test-cron-secret' })).statusCode, 200);
});

test('real QStash receiver validates signing key rotation, raw body hash and callback URL', async () => {
    const currentSigningKey = 'test-current-signing-key', nextSigningKey = 'test-next-signing-key';
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    const body = ' { "eventId": "example" }\n';
    const url = 'https://dreamie.example/api/reminder-delivery';
    const sign = (key, raw = body, callbackUrl = url) => {
        const issued = Math.floor(Date.now() / 1000);
        const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ iss: 'Upstash', sub: callbackUrl, iat: issued, nbf: issued - 1, exp: issued + 60, body: createHash('sha256').update(raw).digest('base64url') })).toString('base64url');
        return `${head}.${payload}.${createHmac('sha256', key).update(`${head}.${payload}`).digest('base64url')}`;
    };
    assert.equal(await receiver.verify({ body, url, signature: sign(currentSigningKey) }), true);
    assert.equal(await receiver.verify({ body, url, signature: sign(nextSigningKey) }), true);
    await assert.rejects(receiver.verify({ body: body.trim(), url, signature: sign(currentSigningKey) }));
    await assert.rejects(receiver.verify({ body, url: `${url}/evil`, signature: sign(currentSigningKey) }));
    await assert.rejects(receiver.verify({ body, url, signature: sign('wrong-key') }));

    const f = fixture();
    const service = createReminderService({ ...f.options, verifySignature: input => receiver.verify(input) });
    await register(f);
    f.clock.value += 60_000;
    const signedBody = `\n${JSON.stringify(f.published[0].body, null, 2)}\n`;
    const fetchHandler = createDeliveryFetchHandler(service);
    const invoke = (raw, signature) => fetchHandler(new Request(url, { method: 'POST', body: raw, headers: { 'upstash-signature': signature } }));
    assert.equal((await invoke(signedBody, sign('wrong-key', signedBody))).status, 401);
    assert.equal((await invoke(signedBody.trim(), sign(currentSigningKey, signedBody))).status, 401);
    assert.equal((await invoke(signedBody, sign(currentSigningKey, signedBody, `${url}/wrong`))).status, 401);
    assert.equal(f.notifications.length, 0);
    assert.equal((await invoke(signedBody, sign(currentSigningKey, signedBody))).status, 200);
    assert.equal(f.notifications.length, 1);
});
