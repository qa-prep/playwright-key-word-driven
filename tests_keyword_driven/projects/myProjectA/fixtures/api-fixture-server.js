// location: tests_keyword_driven/projects/myProjectA/fixtures/api-fixture-server.js
//
// Tiny, dependency-free local HTTP server backing example11's curl-template
// demos - keeps that example genuinely self-contained (no internet, no real
// backend needed), the same spirit as the local file:// HTML pages every
// other myProjectA example uses. Started/stopped automatically by
// Playwright's own webServer option in playwright.config.ts, only when
// PROJECT=myProjectA - no other project pays for this.
const http = require('http');

const PORT = 4100;

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
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  });
});

server.listen(PORT, () => {
  console.log(`myProjectA API fixture server listening on http://localhost:${PORT}`);
});
