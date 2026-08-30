import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

export class DashboardServer {
  constructor(processManager, port = 4000) {
    this.pm = processManager;
    this.port = port;
    this.server = null;
    this.sseClients = new Set();
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.pm.on('log', (log) => {
      this.broadcastSSE('log', log);
    });

    this.pm.on('statusChange', () => {
      this.broadcastSSE('status', this.pm.getStatusSummary());
    });

    this.pm.on('healthUpdate', () => {
      this.broadcastSSE('status', this.pm.getStatusSummary());
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        resolve(this.port);
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    if (this.server) {
      for (const client of this.sseClients) {
        client.end();
      }
      this.sseClients.clear();
      return new Promise((resolve) => this.server.close(resolve));
    }
  }

  broadcastSSE(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // SSE Endpoint
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('\n');
      this.sseClients.add(res);

      // Send initial status immediately
      const initialStatus = `event: status\ndata: ${JSON.stringify(this.pm.getStatusSummary())}\n\n`;
      res.write(initialStatus);

      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // GET /api/status
    if (pathname === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.pm.getStatusSummary()));
      return;
    }

    // GET /api/logs
    if (pathname === '/api/logs' && req.method === 'GET') {
      const serviceId = parsedUrl.searchParams.get('service');
      let logs = [];
      if (serviceId && this.pm.services[serviceId]) {
        logs = this.pm.services[serviceId].logs;
      } else {
        logs = Object.values(this.pm.services).flatMap((s) => s.logs).sort((a, b) => a.id.localeCompare(b.id));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
      return;
    }

    // POST /api/action
    if (pathname === '/api/action' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { service, action } = JSON.parse(body || '{}');
          let result;
          if (service === 'all') {
            if (action === 'start') result = await this.pm.startAll();
            else if (action === 'stop') result = await this.pm.stopAll();
            else if (action === 'restart') result = await this.pm.restartAll();
          } else if (this.pm.services[service]) {
            if (action === 'start') result = await this.pm.startService(service);
            else if (action === 'stop') result = await this.pm.stopService(service);
            else if (action === 'restart') result = await this.pm.restartService(service);
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Invalid service: ${service}` }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Static Files
    let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(publicDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }
}
