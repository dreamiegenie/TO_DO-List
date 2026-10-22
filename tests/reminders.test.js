import test from 'node:test';
import assert from 'node:assert/strict';
import { getReminderTime, getUpcomingReminders, toReminderSnapshot, validateReminder } from '../src/reminders.js';

const now = Date.parse('2026-10-21T12:00:00Z');
const task = { id: 123, task: 'A little task', completed: false, createdAt: '2026-10-18T09:00:00Z', custom: { preserve: true } };

test('older tasks have no implicit reminder and are not mutated', () => {
    const before = structuredClone(task);
    assert.equal(getReminderTime(task), null);
    assert.deepEqual(getUpcomingReminders([task], now), []);
    assert.deepEqual(toReminderSnapshot([task]), []);
    assert.deepEqual(task, before);
});

test('offset choices calculate from the same absolute instant', () => {
    for (const offsetMinutes of [0, 15, 60, 1440]) {
        const dueAt = '2026-10-23T13:00:00+01:00';
        const input = { ...task, dueAt, reminder: { enabled: true, offsetMinutes, revision: 'test-revision' } };
        assert.equal(getReminderTime(input), Date.parse(dueAt) - offsetMinutes * 60000);
        assert.equal(validateReminder(input, task, now).dueAt, '2026-10-23T12:00:00.000Z');
    }
});

test('upcoming summary excludes completed, deleted, disabled and elapsed reminders', () => {
    const base = { ...task, dueAt: '2026-10-22T12:00:00Z', reminder: { enabled: true, offsetMinutes: 0, revision: 'r1' } };
    const earlier = { ...base, id: 124, dueAt: '2026-10-21T13:00:00Z' };
    const tasks = [base, { ...base, id: 1, completed: true }, { ...base, id: 2, deletedAt: '2026-10-20T00:00:00Z' }, { ...base, id: 3, reminder: { enabled: false } }, { ...base, id: 4, dueAt: '2026-10-20T00:00:00Z' }, earlier];
    assert.deepEqual(getUpcomingReminders(tasks, now).map(item => item.id), [124, 123]);
    assert.deepEqual(toReminderSnapshot(tasks).map(item => item.taskId), ['123', '124', '4']);
});

test('validation rejects elapsed reminder triggers but permits due dates without notifications', () => {
    assert.equal(validateReminder({ dueAt: null, reminder: { enabled: true, offsetMinutes: 0 } }, task, now).ok, false);
    assert.equal(validateReminder({ dueAt: 'invalid', reminder: { enabled: false, offsetMinutes: 0 } }, task, now).ok, false);
    assert.equal(validateReminder({ dueAt: '2026-10-21T12:10:00Z', reminder: { enabled: true, offsetMinutes: 15 } }, task, now).ok, false);
    assert.equal(validateReminder({ dueAt: '2026-10-21T13:00:00Z', reminder: { enabled: true, offsetMinutes: 3 } }, task, now).ok, false);
    assert.equal(validateReminder({ dueAt: '2026-10-22T12:00:00Z', reminder: { enabled: true, offsetMinutes: 0 } }, { ...task, completed: true }, now).ok, false);
    assert.equal(validateReminder({ dueAt: '2026-10-20T12:00:00Z', reminder: { enabled: false, offsetMinutes: 0 } }, task, now).ok, true);
    assert.equal(validateReminder({ dueAt: null, reminder: { enabled: false, offsetMinutes: 0 } }, task, now).ok, true);
});
