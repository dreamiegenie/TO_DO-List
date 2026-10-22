import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker(windows = []) {
    const listeners = {}, shown = [], opened = [];
    const self = {
        location: { origin: 'https://dreamie-todos.vercel.app' },
        addEventListener: (name, listener) => { listeners[name] = listener; },
        registration: { showNotification: async (title, options) => { shown.push({ title, options }); } },
        clients: { matchAll: async () => windows, openWindow: async url => { opened.push(url); } },
    };
    vm.runInNewContext(readFileSync(new URL('../public/reminder-worker.js', import.meta.url), 'utf8'), { self, URL });
    return { listeners, shown, opened };
}

async function dispatch(listener, fields) {
    let completion;
    listener({ ...fields, waitUntil: promise => { completion = promise; } });
    await completion;
}

test('push handler always displays a native notification, with stable replacement tag', async () => {
    const { listeners, shown } = worker();
    const data = { json: () => ({ taskId: '123', eventId: 'event-one', revision: 'r1', taskTitle: 'Read a book' }) };
    await dispatch(listeners.push, { data });
    await dispatch(listeners.push, { data });
    assert.equal(shown.length, 2);
    assert.equal(shown[0].options.body, 'Read a book');
    assert.equal(shown[0].options.tag, shown[1].options.tag);
    assert.equal(shown[0].options.renotify, false);
    assert.equal(shown[0].options.data.taskId, '123');
    await dispatch(listeners.push, { data: { json: () => { throw new Error('Invalid JSON'); } } });
    assert.equal(shown.length, 3);
    assert.match(shown[2].options.body, /Open Dreamie/);
});

test('notification click focuses an existing app and sends the relevant task ID', async () => {
    const messages = []; let focused = false, closed = false;
    const existing = { url: 'https://dreamie-todos.vercel.app/', postMessage: value => messages.push(value), focus: async () => { focused = true; } };
    const { listeners, opened } = worker([existing]);
    await dispatch(listeners.notificationclick, { notification: { data: { taskId: '123' }, close: () => { closed = true; } } });
    assert.equal(closed, true); assert.equal(focused, true);
    assert.deepEqual(JSON.parse(JSON.stringify(messages)), [{ type: 'OPEN_TASK', taskId: '123' }]);
    assert.equal(opened.length, 0);
});

test('closed-app click creates only a same-origin task URL', async () => {
    const { listeners, opened } = worker();
    await dispatch(listeners.notificationclick, { notification: { data: { taskId: 'x&task=other', url: 'https://untrusted.example/' }, close() {} } });
    const destination = new URL(opened[0]);
    assert.equal(destination.origin, 'https://dreamie-todos.vercel.app');
    assert.equal(destination.pathname, '/');
    assert.equal(destination.searchParams.get('task'), 'x&task=other');
});
