const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS},
    }).outputText;
    vm.runInNewContext(source, {exports, require: name => {
        if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
        return mocks[name];
    }, TextEncoder, URLSearchParams, process, ...globals});
    return exports;
}
const helpers = load('app/common/Auth/passwordRecovery.ts');
const token = 'a'.repeat(64);

test('passwords match exactly and respect Unicode character and UTF-8 byte boundaries', () => {
    for (const password of ['12345678', 'a'.repeat(72), 'é'.repeat(36), '🔑'.repeat(18), ' password ']) {
        assert.equal(helpers.passwordError(password, password), undefined);
    }
    for (const password of ['1234567', 'a'.repeat(73), 'é'.repeat(37), '🔑'.repeat(19), '🔑'.repeat(7)]) {
        assert.equal(helpers.passwordError(password, password), helpers.PASSWORD_ERROR);
    }
    assert.equal(helpers.passwordError('password ', 'password'), 'Passwords must match.');
});

test('only a single lowercase 64-hex token is accepted and the whole query is immediately removed', () => {
    for (const value of [null, '', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 'z'.repeat(64)]) {
        assert.equal(helpers.validResetToken(value), false);
    }
    assert.equal(helpers.validResetToken(token), true);
    for (const query of [`?token=${token}&tracking=secret`, `?token=${token}&token=${token}`, '']) {
        let replacement;
        const window = {location: {pathname: '/reset-password', search: query}, history: {state: {existing: true}, replaceState: (...args) => {replacement = args;}}};
        vm.runInNewContext(helpers.captureResetTokenScript, {window, URLSearchParams});
        assert.equal(window.__passwordResetToken, query.includes('tracking') ? token : null);
        assert.equal(replacement[2], '/reset-password');
        assert.equal(replacement[0], window.history.state);
    }
});

test('Retry-After supports seconds, HTTP dates and a fallback', () => {
    const now = Date.parse('2026-10-28T12:00:00Z');
    assert.equal(helpers.retryDeadline('120', now), now + 120000);
    assert.equal(helpers.retryDeadline('Wed, 28 Oct 2026 12:02:00 GMT', now), now + 120000);
    assert.equal(helpers.retryDeadline(null, now), now + 60000);
});

function actions(response) {
    const requests = [], deleted = [];
    const api = load('app/common/Auth/actions/passwordRecovery.ts', {
        '../passwordRecovery': helpers,
        'next/headers': {cookies: async () => ({delete: name => deleted.push(name)})},
    }, {fetch: async (url, options) => {
        requests.push({url, ...options});
        if (response instanceof Error) throw response;
        return {status: response.status, json: async () => response.body, headers: {get: () => response.retryAfter ?? null}};
    }});
    return {api, requests, deleted};
}

test('forgot sends anonymous JSON and returns the neutral message without expecting a token', async () => {
    const message = 'If an account exists for that email, a password reset link will be sent.';
    const {api, requests, deleted} = actions({status: 200, body: {message}});
    assert.equal((await api.forgotPassword('person@example.com')).message, message);
    assert.ok(requests[0].url.endsWith('/auth/forgot-password'));
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].headers['Content-Type'], 'application/json');
    assert.equal(requests[0].headers.Authorization, undefined);
    assert.equal(requests[0].body, JSON.stringify({email: 'person@example.com'}));
    assert.equal(deleted.length, 0);
});

test('reset sends the exact password once, makes no validation call, and clears both auth cookies', async () => {
    const {api, requests, deleted} = actions({status: 200, body: {message: helpers.RESET_SUCCESS}});
    const password = ' password🔑 ';
    assert.equal((await api.resetPassword(token, password)).message, helpers.RESET_SUCCESS);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.endsWith('/auth/reset-password'));
    assert.equal(requests[0].headers.Authorization, undefined);
    assert.equal(requests[0].body, JSON.stringify({token, password}));
    assert.deepEqual(deleted, ['user_token', 'refresh_token']);
});

test('bad tokens and passwords never reach the backend', async () => {
    const {api, requests} = actions({});
    assert.equal((await api.resetPassword('bad', 'password')).invalidLink, true);
    assert.equal((await api.resetPassword(token, 'é'.repeat(37))).error, helpers.PASSWORD_ERROR);
    assert.equal(requests.length, 0);
});

test('expired/reused links, validation, 429, 500 and network failures preserve errors without clearing auth', async () => {
    for (const response of [
        {status: 400, body: {error: helpers.INVALID_LINK}},
        {status: 400, body: {error: helpers.PASSWORD_ERROR}},
        {status: 429, body: {error: 'Too many attempts. Please try again later.'}, retryAfter: '120'},
        {status: 500, body: {error: 'Unable to reset password. Please try again later.'}},
        new Error('Network unavailable'),
    ]) {
        const {api, deleted} = actions(response);
        const before = Date.now();
        const result = await api.resetPassword(token, 'password');
        assert.equal(result.error, response.body?.error ?? 'Unable to connect. Please check your connection and try again.');
        assert.equal(Boolean(result.invalidLink), response.body?.error === helpers.INVALID_LINK);
        if (response.status === 429) assert.ok(result.retryAt >= before + 120000);
        assert.equal(deleted.length, 0);
    }
});
