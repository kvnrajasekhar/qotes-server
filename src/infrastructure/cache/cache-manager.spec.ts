/* global jest, describe, beforeEach, it, expect */
/* eslint-disable @typescript-eslint/no-require-imports */

/// <reference types="jest" />

// Import via `require` inside tests so modules can be reset by `jest.resetModules()`.
// Avoid top-level `import` which prevents re-loading the module under test.

jest.mock('../../shared/utils/redis.utils', () => ({
    cacheGetOrSet: jest.fn(),
    cacheGetTyped: jest.fn(),
    cacheSetTyped: jest.fn(),
    cacheDelPattern: jest.fn(),
    cacheDel: jest.fn(),
    cacheExists: jest.fn(),
    cacheExpire: jest.fn(),
    cacheTTL: jest.fn(),
    redis: { ping: jest.fn(), info: jest.fn(), dbsize: jest.fn() },
    RedisKeys: {},
    CacheTTL: {},
}));


describe('CacheManagerService', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('falls back to factory when cacheGetOrSet throws', async () => {
        jest.resetModules();
        const redisUtils = require('../../shared/utils/redis.utils');
        (redisUtils.cacheGetOrSet as jest.Mock).mockRejectedValue(new Error('redis fail'));

        const { CacheManagerService } = require('./cache-manager.service');
        const svc = new CacheManagerService();
        const factory = jest.fn().mockResolvedValue({ ok: true });

        const res = await svc.getOrSet('test:key', factory, 60);

        expect(factory).toHaveBeenCalled();
        expect(res).toEqual({ ok: true });
    });

    it('get returns null on cache get error', async () => {
        jest.resetModules();
        const redisUtils = require('../../shared/utils/redis.utils');
        (redisUtils.cacheGetTyped as jest.Mock).mockRejectedValue(new Error('get fail'));

        const { CacheManagerService } = require('./cache-manager.service');
        const svc = new CacheManagerService();
        const res = await svc.get('some:key');

        expect(res).toBeNull();
    });
});
