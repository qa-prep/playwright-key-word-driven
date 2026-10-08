// location: tests_keyword_driven/projects/myProjectA/fixtures/api-fixture-server.js
//
// Tiny, dependency-free local HTTP server backing example11's curl-template
// demos - keeps that example genuinely self-contained (no internet, no real
// backend needed), the same spirit as the local file:// HTML pages every
// other myProjectA example uses. Started/stopped automatically by
// Playwright's own webServer option in playwright.config.ts, only when
// PROJECT=myProjectA - no other project pays for this.
//
// /login + /whoami exist specifically to demonstrate "I curl template
// ... as user ... and pass ..." (apiClient.ts's getAsUserCurlContext()) against
// something real: two fake accounts, a login that sets a session cookie,
// and a whoami that reads it back - proving the SAME template, called two
// different ways, authenticates as two different identities. The
// credentials are read from the generic _AUTOMATION_API_USERNAME1/
// _SUPER_ADMIN_USERNAME1 env vars already defined in config/local.env for
// every project (NOT hardcoded here - their actual values differ between
// this repo and dash-sites-tests's own local.env).
const http = require('http');

const PORT = 4100;

const FIXTURE_USERS = {
  [process.env._AUTOMATION_API_USERNAME1]: process.env._AUTOMATION_API_PASSWORD1,
  [process.env._SUPER_ADMIN_USERNAME1]: process.env._SUPER_ADMIN_PASSWORD1,
};

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return cookies;
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    if (req.url === '/echo' && req.method === 'POST') {
      let received = {};
      try { received = JSON.parse(body || '{}'); } catch { /* leave empty on bad JSON */ }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, received }));
      return;
    }
    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: 'ok' }));
      return;
    }
    if (req.url === '/login' && req.method === 'POST') {
      let parsed = {};
      try { parsed = JSON.parse(body || '{}'); } catch { /* leave empty on bad JSON */ }
      const { login, password } = parsed;
      if (FIXTURE_USERS[login] && FIXTURE_USERS[login] === password) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `FIXTURE_SESSION=${encodeURIComponent(login)}; Path=/`,
        });
        res.end(JSON.stringify({ success: true, message: `Logged in as ${login}` }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid login or password' }));
      return;
    }
    if (req.url === '/whoami' && req.method === 'GET') {
      const cookies = parseCookies(req.headers.cookie);
      const loggedInAs = cookies.FIXTURE_SESSION ? decodeURIComponent(cookies.FIXTURE_SESSION) : 'guest';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, loggedInAs }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  });
});

server.listen(PORT, () => {
  console.log(`myProjectA API fixture server listening on http://localhost:${PORT}`);
});
