import { getReminderService } from '../server/reminders-runtime.js';
import { createRemindersHandler } from '../server/reminders-http.js';

export default function handler(req, res) {
    return createRemindersHandler(getReminderService())(req, res);
}
