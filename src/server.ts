import http from 'http';

const PORT = process.env.PORT || 10000;

// Minimal server to keep the web service alive
// Actual scraping is triggered manually via Render shell: npm run discover:prod
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Server is running. Use Render shell to run: npm run discover:prod' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chef Indexer - Use Render shell to trigger scraping manually');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('To run scraping manually, use Render shell and execute: npm run discover:prod');
});
