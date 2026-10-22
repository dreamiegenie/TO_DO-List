import { getReminderService } from '../server/reminders-runtime.js';
import { createDeliveryFetchHandler } from '../server/reminders-http.js';

// Keep the exact bytes available for QStash's body-hash verification.
export default {
    fetch(request) {
        return createDeliveryFetchHandler(getReminderService())(request);
    },
};
