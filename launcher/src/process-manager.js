import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ProcessManager extends EventEmitter {
  constructor() {
    super();

    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';

    this.services = {
      backend: {
        id: 'backend',
        name: 'NestJS Backend',
        dir: path.join(rootDir, 'backend'),
        command: npmCmd,
        args: ['run', 'start:dev'],
        port: 3000,
        url: 'http://localhost:3000',
        healthUrl: 'http://localhost:3000/api/health',
        process: null,
        status: 'STOPPED', // STOPPED, STARTING, RUNNING, ERROR, STOPPING
        pid: null,
        startedAt: null,
        restartCount: 0,
        health: { ok: false, lastChecked: null, latencyMs: null, data: null },
        logs: [],
        maxLogs: 1000,
      },
      frontend: {
        id: 'frontend',
        name: 'Angular Frontend',
        dir: path.join(rootDir, 'frontend'),
        command: npmCmd,
        args: ['start'],
        port: 4200,
        url: 'http://localhost:4200',
        healthUrl: 'http://localhost:4200',
        process: null,
        status: 'STOPPED',
        pid: null,
        startedAt: null,
        restartCount: 0,
        health: { ok: false, lastChecked: null, latencyMs: null, data: null },
        logs: [],
        maxLogs: 1000,
      },
    };

    this.healthCheckTimer = null;
  }

  init() {
    this.startHealthCheckLoop();
  }

  getService(id) {
    return this.services[id];
  }

  getAllServices() {
    return Object.values(this.services);
  }

  getStatusSummary() {
    return Object.values(this.services).map((srv) => ({
      id: srv.id,
      name: srv.name,
      status: srv.status,
      port: srv.port,
      url: srv.url,
      pid: srv.pid,
      uptimeSeconds: srv.startedAt ? Math.floor((Date.now() - srv.startedAt) / 1000) : 0,
      restartCount: srv.restartCount,
      health: srv.health,
      lastLog: srv.logs[srv.logs.length - 1] || null,
    }));
  }

  addLog(serviceId, stream, text) {
    const srv = this.services[serviceId];
    if (!srv) return;

    const lines = text.toString().split(/\r?\n/);
    for (const rawLine of lines) {
      if (!rawLine && lines.length > 1) continue;
      const logEntry = {
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        serviceId,
        stream,
        text: rawLine,
        timestamp: new Date().toISOString(),
      };
      srv.logs.push(logEntry);
      if (srv.logs.length > srv.maxLogs) {
        srv.logs.shift();
      }
      this.emit('log', logEntry);
    }
  }

  async startService(id) {
    const srv = this.services[id];
    if (!srv) throw new Error(`Unknown service: ${id}`);
    if (srv.status === 'RUNNING' || srv.status === 'STARTING') {
      return { message: `${srv.name} is already running/starting.` };
    }

    srv.status = 'STARTING';
    srv.startedAt = Date.now();
    this.emit('statusChange', { serviceId: id, status: srv.status });

    this.addLog(id, 'stdout', `[LAUNCHER] Starting ${srv.name}...`);

    try {
      const child = spawn(srv.command, srv.args, {
        cwd: srv.dir,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      srv.process = child;
      srv.pid = child.pid;

      child.stdout.on('data', (data) => {
        this.addLog(id, 'stdout', data.toString());
      });

      child.stderr.on('data', (data) => {
        this.addLog(id, 'stderr', data.toString());
      });

      child.on('error', (err) => {
        srv.status = 'ERROR';
        this.addLog(id, 'stderr', `[LAUNCHER ERROR] Process error: ${err.message}`);
        this.emit('statusChange', { serviceId: id, status: srv.status, error: err.message });
      });

      child.on('close', (code) => {
        const prevStatus = srv.status;
        srv.process = null;
        srv.pid = null;
        if (prevStatus !== 'STOPPING' && prevStatus !== 'STOPPED') {
          srv.status = code === 0 ? 'STOPPED' : 'ERROR';
          this.addLog(id, 'stderr', `[LAUNCHER] ${srv.name} exited with code ${code}`);
        } else {
          srv.status = 'STOPPED';
          this.addLog(id, 'stdout', `[LAUNCHER] ${srv.name} has been stopped.`);
        }
        srv.health.ok = false;
        this.emit('statusChange', { serviceId: id, status: srv.status, exitCode: code });
      });

      return { success: true, message: `${srv.name} process spawned (PID: ${child.pid})` };
    } catch (err) {
      srv.status = 'ERROR';
      this.emit('statusChange', { serviceId: id, status: srv.status, error: err.message });
      throw err;
    }
  }

  async stopService(id) {
    const srv = this.services[id];
    if (!srv) throw new Error(`Unknown service: ${id}`);
    if (!srv.process || srv.status === 'STOPPED') {
      srv.status = 'STOPPED';
      srv.process = null;
      srv.pid = null;
      srv.health.ok = false;
      this.emit('statusChange', { serviceId: id, status: srv.status });
      return { message: `${srv.name} is already stopped.` };
    }

    srv.status = 'STOPPING';
    this.emit('statusChange', { serviceId: id, status: srv.status });
    this.addLog(id, 'stdout', `[LAUNCHER] Stopping ${srv.name}...`);

    const pid = srv.pid;

    return new Promise((resolve) => {
      if (process.platform === 'win32' && pid) {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          srv.status = 'STOPPED';
          srv.process = null;
          srv.pid = null;
          srv.health.ok = false;
          this.emit('statusChange', { serviceId: id, status: srv.status });
          resolve({ success: true, message: `${srv.name} stopped.` });
        });
      } else if (srv.process) {
        srv.process.kill('SIGTERM');
        setTimeout(() => {
          if (srv.process) {
            srv.process.kill('SIGKILL');
          }
          srv.status = 'STOPPED';
          srv.process = null;
          srv.pid = null;
          srv.health.ok = false;
          this.emit('statusChange', { serviceId: id, status: srv.status });
          resolve({ success: true, message: `${srv.name} stopped.` });
        }, 2000);
      } else {
        srv.status = 'STOPPED';
        resolve({ success: true, message: `${srv.name} stopped.` });
      }
    });
  }

  async restartService(id) {
    const srv = this.services[id];
    if (!srv) throw new Error(`Unknown service: ${id}`);
    srv.restartCount += 1;
    this.addLog(id, 'stdout', `[LAUNCHER] Restarting ${srv.name}...`);
    await this.stopService(id);
    await new Promise((r) => setTimeout(r, 1000));
    return this.startService(id);
  }

  async startAll() {
    const results = {};
    for (const id of Object.keys(this.services)) {
      results[id] = await this.startService(id);
    }
    return results;
  }

  async stopAll() {
    const results = {};
    for (const id of Object.keys(this.services)) {
      results[id] = await this.stopService(id);
    }
    return results;
  }

  async restartAll() {
    const results = {};
    for (const id of Object.keys(this.services)) {
      results[id] = await this.restartService(id);
    }
    return results;
  }

  startHealthCheckLoop() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);

    const checkServiceHealth = (srv) => {
      if (srv.status === 'STOPPED' || srv.status === 'STOPPING') {
        srv.health.ok = false;
        srv.health.lastChecked = new Date().toISOString();
        return;
      }

      const startReq = Date.now();
      const req = http.get(srv.healthUrl, { timeout: 2000 }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          const latency = Date.now() - startReq;
          const isHealthy = res.statusCode >= 200 && res.statusCode < 400;

          srv.health.ok = isHealthy;
          srv.health.statusCode = res.statusCode;
          srv.health.latencyMs = latency;
          srv.health.lastChecked = new Date().toISOString();

          try {
            srv.health.data = JSON.parse(rawData);
          } catch {
            srv.health.data = rawData.slice(0, 100);
          }

          if (srv.status === 'STARTING' && isHealthy) {
            srv.status = 'RUNNING';
            this.emit('statusChange', { serviceId: srv.id, status: srv.status });
          }

          this.emit('healthUpdate', { serviceId: srv.id, health: srv.health });
        });
      });

      req.on('error', () => {
        srv.health.ok = false;
        srv.health.lastChecked = new Date().toISOString();
        this.emit('healthUpdate', { serviceId: srv.id, health: srv.health });
      });

      req.on('timeout', () => {
        req.destroy();
        srv.health.ok = false;
        srv.health.lastChecked = new Date().toISOString();
        this.emit('healthUpdate', { serviceId: srv.id, health: srv.health });
      });
    };

    this.healthCheckTimer = setInterval(() => {
      for (const srv of Object.values(this.services)) {
        checkServiceHealth(srv);
      }
    }, 2500);
  }

  destroy() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    return this.stopAll();
  }
}
