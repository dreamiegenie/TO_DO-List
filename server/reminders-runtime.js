import process from 'node:process';
import { Redis } from '@upstash/redis';
import { Client, Receiver } from '@upstash/qstash';
import webPush from 'web-push';
import { createReminderService } from './reminders-core.js';
import { createRedisStore } from './reminders-store.js';

let cached;

export function readConfiguration(env) {
    const required = ['REMINDERS_ORIGIN', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
        'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'QSTASH_TOKEN',
        'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY', 'CRON_SECRET'];
    let origin = '';
    try {
        const parsed = new URL(env.REMINDERS_ORIGIN);
        if (parsed.protocol === 'https:' && parsed.origin === env.REMINDERS_ORIGIN && !parsed.username && !parsed.password) origin = parsed.origin;
    } catch { /* An absent/invalid origin keeps the feature disabled. */ }
    return {
        configured: env.REMINDERS_ENABLED === 'true' && Boolean(origin) && required.every(key => Boolean(env[key]?.trim())),
        origin,
        publicKey: env.VAPID_PUBLIC_KEY ?? null,
        cronSecret: env.CRON_SECRET ?? '',
    };
}

export function getReminderService() {
    if (cached) return cached;
    const config = readConfiguration(process.env);
    if (!config.configured) {
        cached = createReminderService({ store: {}, queue: {}, notify: () => {}, verifySignature: () => false, config });
        return cached;
    }
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, automaticDeserialization: false });
    const client = new Client({ token: process.env.QSTASH_TOKEN });
    const receiver = new Receiver({ currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY });
    cached = createReminderService({
        config,
        store: createRedisStore(redis),
        queue: { publish: options => client.publishJSON(options), cancel: id => client.messages.cancel(id) },
        verifySignature: options => receiver.verify(options),
        notify: (subscription, payload, options) => webPush.sendNotification(subscription, JSON.stringify(payload), {
            ...options,
            timeout: 10_000,
            vapidDetails: { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY },
        }),
    });
    return cached;
}
