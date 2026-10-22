# Dreamie reminders and recycle-bin update

The notification backend is disabled by default. Publishing the application does not enable closed-app alerts or create any external services. See [the Vercel + Upstash setup guide](REMINDERS-BACKEND.md) before configuring and enabling it.

## Using the new controls

- Choose **Schedule** on an active task to add an optional due date/time. Enable **Remind me** for an alert at that time, 15 minutes before, one hour before or one day before. Dates use the device's local time and are stored as an absolute ISO timestamp.
- Use **Edit reminder** to change the date or offset, cancel the reminder or remove the due date. Saving a reminder preference does not enable browser notifications automatically.
- Open **Reminders** through the original calendar-heart sidebar control. It shows the upcoming count and next alert; its task view lists future enabled reminders. **All tasks** remains available separately.
- Notification permission is requested only through **Enable notifications**. Until the hosted service is configured, the app clearly says that dates/preferences are local and closed-app delivery is unavailable.
- Inside **Deleted Tasks**, choose **Delete permanently** for one task or **Empty Bin** for every deleted task, including tasks hidden by search. Both require a confirmation explaining that deletion cannot be undone. Cancel is initially focused. Restore remains available, and nothing is purged automatically.

## Data and offline behaviour

Existing task records are not rewritten on startup. Older tasks work without a reminder field, and updates retain unknown metadata. Due dates add `dueAt`; reminder settings add `reminder.enabled`, `reminder.offsetMinutes` and a schedule revision. Existing localStorage keys, Quick Notes and categories remain in use.

Task changes are saved synchronously before showing success. Unreadable or malformed task storage is kept intact and pauses reminder uploads, so a read failure cannot upload an empty snapshot and cancel valid server reminders. A failed save keeps the editor/confirmation and reports an error.

When notifications are enabled, a small localStorage marker and an IndexedDB outbox preserve reminder-sync intent across reloads, temporary storage/network failures and permanent deletion of the original task. Cross-tab writes and delayed server responses are checked against the current revision. Explicit unsubscription can retry even while tasks are unreadable.

Adding, editing, completing, deleting, restoring and permanently deleting tasks remains possible offline after the app is cached. Quick Notes and the open-app Focus Timer continue working. Remote cancellation takes effect only after connectivity returns and the app synchronizes; an earlier reminder can still arrive until then. Real delivery also depends on the push provider and device. Full limits are in the setup guide.

## Files changed

| Files | Purpose |
| --- | --- |
| `src/App.jsx`, `src/SideBar.jsx`, `src/TaskSection.jsx` | Wire due dates, upcoming reminders, task navigation and recycle-bin actions into existing components. |
| `src/ReminderEditor.jsx`, `src/Dialog.jsx`, `src/ConfirmDialog.jsx`, `src/NotificationSettings.jsx` | Accessible themed controls, confirmations and truthful setup/sync feedback. |
| `src/reminders.js`, `src/useLocalTasks.js` | Date validation, reminder snapshots and safe immediate task persistence. |
| `src/useReminders.js`, `src/pushClient.js`, `src/reminderQueue.js` | Explicit opt-in, unsubscribe/reconnect and durable synchronization. |
| `public/reminder-worker.js`, `vite.config.js` | Import push/click handling into the existing PWA worker without replacing its cache/update flow. |
| `api/reminders.js`, `api/reminder-delivery.js`, `api/reminder-maintenance.js`, `server/reminders-*.js` | Prepared anonymous-device API, Redis state, QStash scheduling and signed Web Push delivery. |
| `.env.example`, `.gitignore`, `vercel.json` | Disabled-by-default placeholders, credential ignore rules and one daily maintenance cron. No actual secrets. |
| `package.json`, `package-lock.json`, `eslint.config.js`, `tests/*.test.js` | Backend dependencies, compatible security patches, test command and focused regression tests. |
| `README.md`, `docs/REMINDERS-UPDATE.md`, `docs/REMINDERS-BACKEND.md` | Review notes and setup instructions. |

Existing navigation styling, `src/index.css`, greeting, widget/timer/note components, HTML/SEO metadata, icons, fonts and artwork are unchanged. Every original inline SVG in the sidebar and task section is retained exactly.

## Verification and remaining setup

- Production build and ESLint pass; 28 unit/backend/worker checks pass.
- Eighteen isolated browser checks cover permission timing, durable sync, invalid-storage protection, unsubscribe recovery, stale responses and cross-tab revision recovery. Permission and push APIs are mocked in these checks.
- UI checks cover scheduling/editing/cancelling, legacy metadata preservation, confirmation safety, failed writes and both themes at 320, 375, 390, 430, 1024 and 1440 px without horizontal overflow.
- Offline checks use isolated Chromium and WebKit profiles. WebKit is tested by stopping its local origin server after caching; this is not a physical iPhone airplane-mode test. Tasks, notes, timer, fonts and artwork remain available.
- Two-tab PWA update checks pass in Chromium and WebKit: discovering an update or choosing Later does not reload the app; accepting it preserves saved data and active drafts/timer, and checkpoints are consumed once.

**Not verified:** real Upstash Redis Lua execution, hosted Vercel/QStash integration, actual Web Push delivery or closed-app Android/iOS notification behaviour. No credentials or physical devices were available for those checks. They require approved service configuration and an approved preview deployment. Enabling hosted notifications in production requires the owner’s approval.
