import { getReminderService } from '../server/reminders-runtime.js';
import { createMaintenanceHandler } from '../server/reminders-http.js';

export default function handler(req, res) {
    return createMaintenanceHandler(getReminderService())(req, res);
}
