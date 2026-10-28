// Run with PLAYWRIGHT_MODULE pointing to an installed playwright or playwright-core.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {spawn} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');

test('password recovery in Chromium with a contract mock backend', {timeout: 180000}, async () => {
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
    const token = 'a'.repeat(64), expired = 'b'.repeat(64);
    const success = 'Password reset successfully. Please sign in with your new password.';
    const neutral = 'If an account exists for that email, a password reset link will be sent.';
    let password = 'old-password', used = false, nextResponse, slow = false;
    const requests = [];
    const backend = http.createServer(async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const body = raw ? JSON.parse(raw) : {};
        requests.push({url: req.url, body, headers: req.headers});
        const reply = (status, data) => {res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data));};
        if (slow) await delay(300);
        if (nextResponse && req.url.startsWith('/auth/')) {
            const response = nextResponse; nextResponse = undefined;
            if (response.network) {req.socket.destroy(); return;}
            if (response.retry) res.setHeader('Retry-After', response.retry);
            return reply(response.status, {error: response.error});
        }
        if (req.url === '/auth/forgot-password') return reply(200, {message: neutral});
        if (req.url === '/auth/reset-password') {
            if (body.token !== token || used) return reply(400, {error: 'Invalid or expired reset link.'});
            password = body.password; used = true;
            return reply(200, {message: success});
        }
        if (req.url === '/auth') return body.password === password
            ? reply(200, {user_token: 'new-user-token', refresh_token: 'new-refresh-token'})
            : reply(400, {error: 'Invalid credentials'});
        if (req.url === '/users') return reply(200, [{email: 'person@example.com'}]);
        if (req.url === '/session' && req.method === 'POST') return reply(200, 'browser-session');
        if (req.url.startsWith('/session/')) return reply(200, [{state: 'active'}]);
        return reply(404, {});
    });
    await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
    const origin = 'http://localhost:3123';
    const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.env.RECOVERY_TEST_PRODUCTION ? 'start' : 'dev', '-p', '3123'], {
        env: {...process.env, BACKEND_URL: `http://127.0.0.1:${backend.address().port}`, NEXT_PUBLIC_BASE_URL: origin, NEXT_TELEMETRY_DISABLED: '1'},
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    server.stdout.on('data', chunk => {logs += chunk;});
    server.stderr.on('data', chunk => {logs += chunk;});
    let browser;
    try {
        for (let attempts = 0; ; attempts++) {
            try {await fetch(origin + '/forgot-password'); break;}
            catch {if (attempts > 100) throw new Error('Next dev did not start'); await delay(500);}
        }
        browser = await chromium.launch({headless: true});
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        await page.goto(origin + '/admin');
        await page.getByRole('link', {name: 'Forgot password?'}).click();
        await page.getByLabel('Email', {exact: true}).fill('person@example.com');
        for (const failure of [
            {status: 400, error: 'Please enter a valid email address.'},
            {status: 429, error: 'Too many attempts. Please try again later.', retry: '1'},
            {network: true},
        ]) {
            nextResponse = failure;
            await page.getByRole('button', {name: 'Send reset link'}).click();
            await page.getByRole('alert').filter({hasText: failure.error || 'check your connection'}).waitFor();
            if (failure.retry) await page.waitForFunction(() => !document.querySelector('button').disabled);
            assert.equal(await page.getByRole('button', {name: 'Send reset link'}).isEnabled(), true);
        }
        slow = true;
        await page.getByRole('button', {name: 'Send reset link'}).click();
        await page.getByRole('button', {name: 'Submitting…'}).waitFor();
        assert.equal(await page.getByRole('button', {name: 'Submitting…'}).isDisabled(), true);
        await page.getByRole('status').filter({hasText: neutral}).waitFor(); slow = false;
        const forgot = requests.findLast(request => request.url === '/auth/forgot-password');
        assert.deepEqual(forgot.body, {email: 'person@example.com'});
        assert.equal(forgot.headers.authorization, undefined);

        for (const suffix of ['', '?token=bad', `?token=${token}&token=${token}`]) {
            await page.goto(origin + '/reset-password' + suffix);
            await page.getByRole('link', {name: 'Request another reset email'}).waitFor();
            assert.equal(page.url(), origin + '/reset-password');
        }
        const response = await page.goto(origin + '/reset-password?token=' + token);
        const responseHeaders = await response.allHeaders();
        assert.equal(responseHeaders['referrer-policy'], 'no-referrer', JSON.stringify({status: response.status(), headers: responseHeaders}));
        await page.getByLabel('New password', {exact: true}).waitFor();
        assert.equal(page.url(), origin + '/reset-password');
        assert.equal(await page.locator('meta[name="referrer"]').getAttribute('content'), 'no-referrer');
        assert.equal(await page.evaluate(() => window.__passwordResetToken), undefined);
        assert.equal(await page.evaluate(value => JSON.stringify(history.state).includes(value), token), false, 'token must not persist in history state');
        assert.equal(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage])).then(value => value.includes(token)), false);
        assert.equal(await page.getByLabel('New password', {exact: true}).getAttribute('autocomplete'), 'new-password');
        const submit = () => page.getByRole('button', {name: 'Reset password', exact: true}).click();
        const fill = async (value, confirmation = value) => {
            await page.getByLabel('New password', {exact: true}).fill(value);
            await page.getByLabel('Confirm password').fill(confirmation);
        };
        for (const value of ['short', 'é'.repeat(37)]) {
            await fill(value); await submit();
            await page.getByRole('alert').filter({hasText: '72 UTF-8 bytes'}).waitFor();
        }
        await fill('new-password', 'other-password'); await submit();
        await page.getByRole('alert').filter({hasText: 'Passwords must match.'}).waitFor();
        assert.equal(requests.filter(request => request.url === '/auth/reset-password').length, 0);
        await fill(' new-password🔑 ');
        for (const failure of [
            {status: 429, error: 'Too many attempts. Please try again later.', retry: '2'},
            {status: 500, error: 'Unable to reset password. Please try again later.'},
            {network: true},
        ]) {
            nextResponse = failure; await submit();
            await page.getByRole('alert').filter({hasText: failure.error || 'check your connection'}).waitFor();
            if (failure.retry) {
                await page.getByRole('status').filter({hasText: 'Try again in'}).waitFor();
                assert.equal(await page.getByRole('button', {name: 'Reset password', exact: true}).isDisabled(), true);
                await page.waitForFunction(() => !document.querySelector('button').disabled);
            }
            assert.equal(await page.getByRole('button', {name: 'Reset password', exact: true}).isEnabled(), true);
        }
        await context.addCookies(['user_token', 'refresh_token'].map(name => ({name, value: 'stale-auth', url: origin, httpOnly: true})));
        await submit();
        await page.waitForURL('**/admin?passwordReset=success');
        await page.getByRole('status').filter({hasText: success}).waitFor();
        assert.equal((await context.cookies()).filter(cookie => ['user_token', 'refresh_token'].includes(cookie.name)).length, 0);
        assert.equal(password, ' new-password🔑 ');
        for (const badToken of [expired, token]) {
            await page.goto(origin + '/reset-password?token=' + badToken);
            await fill('different-password'); await submit();
            await page.getByRole('link', {name: 'Request another reset email'}).waitFor();
        }
        await page.goto(origin + '/admin');
        await page.locator('input[name=email]').fill('person@example.com');
        await page.locator('input[name=password]').fill('old-password');
        await page.getByRole('button', {name: 'Log In'}).click();
        await page.getByText('Invalid Credentials. Please Try again').waitFor();
        await page.route('**/admin/dashboard', route => route.fulfill({status: 200, contentType: 'text/html', body: '<p>Signed in</p>'}));
        await page.locator('input[name=password]').fill(' new-password🔑 ');
        await page.getByRole('button', {name: 'Log In'}).click();
        await page.waitForURL('**/admin/dashboard');
        assert.equal((await context.cookies()).find(cookie => cookie.name === 'user_token').value, 'new-user-token');
        assert.equal(logs.includes(token), false, 'reset query must not appear in Next request logs');
        assert.equal(requests.some(request => request.url.includes(token)), false);
    } finally {
        await browser?.close();
        server.kill();
        backend.closeAllConnections();
        await new Promise(resolve => backend.close(resolve));
    }
});
