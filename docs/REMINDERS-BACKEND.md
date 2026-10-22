# Background reminders: Vercel + Upstash setup

The code is prepared for Vercel Functions, Upstash Redis, QStash and standard Web Push. No notification service has been provisioned and no real push has been sent. Deploying the application alone does not enable hosted notifications: both opt-in flags default to false. Creating external resources, adding their secrets and enabling notifications require the owner’s approval.

Tasks, notes, themes and categories remain local. Only reminder-bearing active task IDs, reminder revisions, due dates, offsets and a title limited to 200 characters are synchronized for the enabled browser. Completed, deleted and disabled reminders are absent from the next complete snapshot. A permanent deletion removes the corresponding task metadata from the server after that snapshot reaches it.

## Architecture

1. The user explicitly enables notifications in a supporting browser. The browser creates its own PushSubscription; the app posts it and the full reminder snapshot to `/api/reminders`.
2. The API mints a random 256-bit device token in a `__Host-` HttpOnly, Secure, SameSite=Strict cookie. Redis stores the token’s SHA-256 hash as the device ID. There is no login, email address or mandatory account.
3. Redis atomically accepts only a newer synchronization revision, replaces this device’s snapshot and records durable scheduling/cancellation work. This authoritative state is updated before physical queue cancellation.
4. Jobs due within six days are published as QStash one-shot requests. Far-future jobs wait in Redis; the authenticated daily maintenance job promotes them as they enter that horizon and retries pending work.
5. QStash signs the callback. `/api/reminder-delivery` verifies the exact original body, expected callback URL and current/next signing key before reading device data. An atomic claim checks that the device is still subscribed and the task/event is current before sending Web Push.
6. The service worker displays a visible notification with the reminder’s task title and a stable event tag, then opens the corresponding task on click. Web Push encrypts the payload in transit to the browser; notification text may appear on the lock screen according to the device’s settings. Quick Notes are never included.

The callback is a Vercel Web Request `fetch` handler, preserving the signed request bytes. It does not rely on the Next.js-only `api.bodyParser` option or reconstructed JSON. Vercel documents this export in its [Node.js runtime reference](https://vercel.com/docs/functions/runtimes/node-js). QStash documents [signature verification](https://upstash.com/docs/qstash/features/security).

## Approved setup steps, when permission is granted

1. Create one Upstash Redis database and one QStash account/region suitable for the app. Keep their credentials on the server. Do not expose Redis tokens, the QStash token, signing keys, VAPID private key or cron secret through a `VITE_` variable.
2. Generate one VAPID key pair locally with the installed `web-push` package: `npx web-push generate-vapid-keys --json`. Keep that key pair stable. Rotating it generally requires browsers to unsubscribe and subscribe again.
3. Set the following environment variables in the intended Vercel environment. The examples below are placeholders, not real credentials.

```dotenv
# Frontend remains disabled until explicitly approved and configured.
VITE_REMINDERS_ENABLED=false

# Server opt-in; use true only in the environment being enabled.
REMINDERS_ENABLED=false
REMINDERS_ORIGIN=https://dreamie-todos.vercel.app
VAPID_PUBLIC_KEY=REPLACE_WITH_PUBLIC_VAPID_KEY
VAPID_PRIVATE_KEY=REPLACE_WITH_PRIVATE_VAPID_KEY
VAPID_SUBJECT=mailto:REPLACE_WITH_OWNER_CONTACT
UPSTASH_REDIS_REST_URL=https://REPLACE_WITH_REDIS_URL
UPSTASH_REDIS_REST_TOKEN=REPLACE_WITH_REDIS_TOKEN
QSTASH_TOKEN=REPLACE_WITH_QSTASH_TOKEN
QSTASH_CURRENT_SIGNING_KEY=REPLACE_WITH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY=REPLACE_WITH_NEXT_SIGNING_KEY
CRON_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

`REMINDERS_ORIGIN` must exactly equal the HTTPS origin, without a trailing slash or path. It is both the allowed mutation origin and the signed delivery destination. Use separate Redis/QStash resources or credentials for isolated preview testing; do not point an unapproved preview at production state. The public VAPID key is read from `GET /api/reminders`; a second frontend public-key variable is unnecessary. Vercel protects an authenticated cron request by sending `Authorization: Bearer <CRON_SECRET>`; see [securing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

4. Keep the existing Vercel static/PWA headers, and merge one daily cron entry into `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/reminder-maintenance", "schedule": "0 0 * * *" }
  ]
}
```

The prepared project already contains this entry. Do not add an every-minute cron on Hobby. Vercel Hobby permits daily execution, with an imprecise invocation time within the scheduled hour; see [cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing). The six-day promotion window leaves several days of slack before the scheduled send. There is no QStash recurring schedule to create.

5. Before enabling, approve a preview deployment and complete real-device tests below. When configuration is complete, set both enable flags to `true` for the approved environment and rebuild. Missing required server settings keep `GET /api/reminders` at `configured:false`; writes fail safely with 503.
6. After preview acceptance, obtain approval before enabling hosted notifications in production. Keep secrets in Vercel settings, not Git, screenshots, logs or this guide.

## API contract

All responses use `Cache-Control: no-store`. Mutation requests require an exact matching `Origin`, same-origin fetch metadata when present, JSON, and same-origin cookies. The API is for browser use on this app’s origin, not a public arbitrary push relay.

| Request | Purpose and response |
| --- | --- |
| `GET /api/reminders` | `{ configured, publicKey, subscribed, revision }`. Public key is public by design; no task/subscription details are returned. |
| `POST /api/reminders` | Explicit enable or re-enable; accepts subscription plus the complete snapshot and mints/renews the cookie. |
| `PUT /api/reminders` | Replaces this subscribed device’s entire snapshot; cookie required. Missing task IDs cancel those jobs. |
| `DELETE /api/reminders` | `{ revision }`; cancels all jobs for this cookie’s device, clears subscription data and retains the synchronization tombstone. |
| `POST /api/reminder-delivery` | QStash-signed internal callback; no browser credentials. Body is bounded to 4 KB. |
| `GET /api/reminder-maintenance` | Internal daily maintenance; exact cron bearer secret required. |

POST/PUT body:

```json
{
  "revision": 1792584000000,
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/EXAMPLE",
    "keys": { "p256dh": "BROWSER_GENERATED_KEY", "auth": "BROWSER_GENERATED_AUTH" }
  },
  "reminders": [
    {
      "taskId": "task-uuid",
      "revision": "reminder-revision-uuid",
      "dueAt": "2026-11-01T12:00:00.000Z",
      "offsetMinutes": 15,
      "taskTitle": "Read a chapter"
    }
  ]
}
```

`revision` is the device snapshot’s monotonically increasing safe integer. The client persists it in IndexedDB and serializes writes/retries, advancing beyond the server revision. A repeated identical revision/snapshot is idempotent. A lower revision, or reused revision with different content, returns 409. After DELETE, a higher PUT still cannot re-enable notifications; explicit POST is required. Concurrent updates use a Redis version comparison and retry, rather than read/overwrite races.

`reminders[].revision` identifies the task’s reminder schedule. Changing due time, offset, enabling, restoring or otherwise creating a new reminder must change this revision. A title-only update may retain it; the existing event is preserved and its title metadata updated. Include unchanged valid enabled reminders even just after their due time. The backend preserves their original delivery grace; a newly introduced/rescheduled/restored reminder whose send time is already past is marked expired and will not send immediately.

Success is `{ ok:true, revision }`, with `pending:true` while durable near-term scheduling or cancellation work still needs retry. The client should retain/retry its durable snapshot while pending. Errors are non-2xx `{ ok:false, error, code }`; report them without silently implying a reminder was scheduled. GET can return 503 when a configured Redis service is unavailable.

The API accepts at most 100 reminder records and 64 KB per snapshot. Task IDs/revisions have bounded safe identifier characters; offsets are 0, 15, 60 or 1440 minutes; calendar dates and P-256 push keys are validated. Server rates are 120 status reads/minute/IP, 60 mutations/minute/IP, and 20 explicit registrations/day/IP. Shared-IP users can reach these limits and should retry after the indicated period. Redis stores rate-limit keys under hashes; it does not store raw IPs in those keys.

Only HTTPS endpoints belonging to the supported FCM, Mozilla, Apple or Windows push providers are accepted; arbitrary hosts, credentials, ports and local IP endpoints are rejected to prevent server-side request forgery. A newly supported browser/provider may need an explicit reviewed allowlist update. Endpoint ownership prevents one anonymous session from taking over another session’s browser endpoint. If cookies are cleared while the old browser subscription survives, unsubscribe that browser subscription and explicitly enable again to create a fresh one; there is no account recovery or cross-device account link.

## Cancellation, delivery and privacy limits

- **Offline changes are local first.** If a device completes, deletes, permanently deletes or disables a reminder while offline, the durable client snapshot must be synchronized when the app next has a connection. Until the server receives it, an earlier server job can still send. Safari/iOS has no Background Sync API, so reopening the app online may be necessary. Local deletion alone cannot cancel a remote scheduler. See [browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/SyncManager.json).
- **After cancellation is synchronized**, the authoritative event/version check blocks pending callbacks, even if physical QStash cancellation fails and is retried later. A send already accepted by a push provider, or racing between the final state check and provider acceptance, cannot be recalled. The code cancels specific message IDs, never a project-wide queue.
- **Delivery is best effort.** Jobs have a three-minute server grace window and a push TTL no longer than the remaining grace. The provider/OS may delay, suppress or discard a push; an offline device can miss it. This is not an alarm-clock guarantee. Past, expired jobs do not catch up hours later. See the [Web Push protocol TTL rules](https://www.rfc-editor.org/rfc/rfc8030.html#section-5.2).
- **Duplicate protection is durable but not mathematically exactly once.** Atomic claims, event versions and sent status block normal callback duplication. QStash’s publish deduplication is an additional ten-minute safeguard, not the only ledger. A process crash after a provider accepts a push but before Redis records `sent` can cause a later retry. Stable Web Push topic/notification tag reduces visible duplicates where supported; it cannot prove exactly-once delivery. See QStash [at-least-once delivery](https://upstash.com/docs/qstash/features/at-least-once) and [deduplication](https://upstash.com/docs/qstash/features/deduplication).
- **Outage recovery has limits.** The snapshot is durable before publishing. While the app is open it can retry pending synchronization; daily maintenance is the backstop when it is closed. A queue outage at scheduling time can still make a near-term reminder miss its three-minute deadline before the daily retry. The API’s pending state must stay visible until acknowledged. A Redis outage prevents safe sends rather than sending against stale state.
- **iPhone/iPad:** Web Push requires iOS/iPadOS 16.4+ and a web app added to the Home Screen; permission must follow a direct user action. A normal browser tab is insufficient. No Apple Developer membership is required. See [WebKit’s platform requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Every received push must display a visible notification; silently dropping a stale event in the service worker can revoke permission. Cancellation therefore happens on the server before push whenever possible. See [Apple’s Web Push session](https://developer.apple.com/videos/play/wwdc2022/10098/?time=163).
- **No mandatory account means no cross-device restore.** Cookie loss does not recover the previous anonymous session. The app’s local tasks remain separate from the scheduler. Records expire after at least one year from the last backend update, or seven days after the latest far-future reminder if later. Sent/expired job metadata can remain until that expiry or a newer snapshot removes it. Unsubscription retains only device revision/digest tombstones, cancellation message IDs temporarily, and hashed endpoint ownership until their expiry.
- Maintenance handles up to 200 due devices per invocation; this prepared design targets a small app. At larger scale, use a paid higher-frequency/partitioned maintenance worker and monitor backlog rather than assuming one daily invocation can drain unlimited devices.

## Service limits and costs

At preparation time, Upstash documents QStash Free as 1,000 messages/day, a seven-day maximum delay and 10 active recurring schedules. Redis Free is documented as 256 MB and 500,000 commands/month. QStash pay-as-you-go starts at $1 per 100,000 messages; Redis pay-as-you-go at $0.20 per 100,000 commands. Confirm current limits and regional/account eligibility before creating anything: [QStash pricing](https://upstash.com/pricing/qstash), [Redis pricing](https://upstash.com/pricing/redis), [QStash delay limits](https://upstash.com/docs/qstash/features/delay).

One reminder normally publishes one QStash message; rescheduling, retries and cancellation traffic can add usage. Redis uses multiple commands per mutation, CAS transaction, callback and maintenance pass, so 500,000 commands is not 500,000 reminders. Function usage also counts against the selected Vercel plan. No billing cap or guaranteed free operation is implied; configure the providers’ usage alerts/limits after approval.

## Verification

Local backend checks run with `node --test tests/backend-reminders.test.js` and `npx eslint api server tests/backend-reminders.test.js`. They use an injected in-memory store/queue/push sender and no external services. They cover schema/endpoint validation, secure cookie identity, stale/idempotent revisions, per-device isolation, unsubscribe tombstones, permanent-deletion cancellation, cancellation failure/retry, scheduling failure/restart, far-future promotion, past restoration, title updates just after due, delivery deadlines, invalid signatures, concurrent duplicate callbacks, a callback before publish acknowledgement, provider failures, payload fields, origin/rate/size checks, and cron authorization.

The real installed QStash Receiver is also exercised using locally signed HS256 tokens, exact body bytes and callback URL/issuer claims. This validates the cryptographic and Web Request path without calling Upstash. It does not validate a real Vercel deployment, Redis Lua execution in a real Upstash database, QStash networking, VAPID/provider credentials or actual notification delivery.

After setup and an approved preview deployment, verify: enable permission through the app button; send a short-delay reminder with app visible, backgrounded and closed; click it into the correct task; reschedule, complete, delete and permanently delete before due; unsubscribe one of two devices while preserving the other; test local offline cancellation followed by reopening online; test queue failure/pending state; and test an installed iPhone/iPad web app. Inspect only redacted provider logs and notification outcomes. Do not claim production delivery works until these integration checks pass.
