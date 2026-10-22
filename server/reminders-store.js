const PREFIX = 'dreamie:reminders:v1:';
const INDEX = `${PREFIX}maintenance`;

const CAS = `
local previous = redis.call('GET', KEYS[1])
local version = -1
if previous then version = tonumber(cjson.decode(previous).version) end
if version ~= tonumber(ARGV[1]) then return 0 end
if KEYS[3] ~= '' then
  local owner = redis.call('GET', KEYS[3])
  if owner and owner ~= ARGV[3] then return -1 end
  redis.call('SET', KEYS[3], ARGV[3], 'EXAT', ARGV[5])
end
redis.call('SET', KEYS[1], ARGV[2], 'EXAT', ARGV[5])
if ARGV[4] == '' then redis.call('ZREM', KEYS[2], ARGV[3])
else redis.call('ZADD', KEYS[2], ARGV[4], ARGV[3]) end
return 1
`;

const RATE = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

export function createRedisStore(redis) {
    return {
        async getDevice(id) {
            const value = await redis.get(`${PREFIX}device:${id}`);
            return typeof value === 'string' ? JSON.parse(value) : value;
        },
        async compareAndSetDevice(id, version, next) {
            const result = await redis.eval(CAS,
                [`${PREFIX}device:${id}`, INDEX, next.endpointHash ? `${PREFIX}endpoint:${next.endpointHash}` : ''],
                [version, JSON.stringify(next), id, next.maintenanceAt ?? '', Math.ceil(next.expiresAt / 1000)]);
            return result === -1 ? 'owned' : result === 1;
        },
        async listDueDevices(now, limit) {
            return redis.zrange(INDEX, '-inf', now, { byScore: true, offset: 0, count: limit });
        },
        async removeDueDevice(id) { await redis.zrem(INDEX, id); },
        async rateLimit(key, limit, seconds) {
            return await redis.eval(RATE, [`${PREFIX}rate:${key}`], [seconds]) <= limit;
        },
    };
}
