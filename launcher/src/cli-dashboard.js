import readline from 'node:readline';
import { openBrowser } from './open-browser.js';


const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

export class CliDashboard {
  constructor(processManager, dashboardPort = 4000) {
    this.pm = processManager;
    this.dashboardPort = dashboardPort;
    this.isRawMode = false;
  }

  start() {
    this.printBanner();

    this.pm.on('log', (log) => {
      this.printLog(log);
    });

    this.pm.on('statusChange', ({ serviceId, status }) => {
      const srv = this.pm.getService(serviceId);
      const color = status === 'RUNNING' ? colors.green : status === 'STARTING' ? colors.yellow : colors.red;
      console.log(`\n${colors.bright}[LAUNCHER STATUS]${colors.reset} ${srv?.name || serviceId} -> ${color}${status}${colors.reset}\n`);
    });

    this.setupKeybindings();
  }

  printBanner() {
    console.log(`
${colors.cyan}======================================================================${colors.reset}
${colors.bright}${colors.cyan}🚀  BODY DASHBOARD LAUNCHER & ORCHESTRATOR${colors.reset}
${colors.cyan}======================================================================${colors.reset}
${colors.dim}• Web Dashboard:${colors.reset}  ${colors.bright}http://localhost:${this.dashboardPort}${colors.reset}
${colors.dim}• NestJS Backend:${colors.reset} ${colors.green}http://localhost:3000${colors.reset}
${colors.dim}• Angular App:${colors.reset}    ${colors.green}http://localhost:4200${colors.reset}
----------------------------------------------------------------------
${colors.yellow}Shortcuts:${colors.reset} [b] Restart Backend | [f] Restart Frontend | [r] Restart All
           [o] Open Dashboard   | [q] Stop & Exit
${colors.cyan}======================================================================${colors.reset}
`);
  }

  printLog(log) {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const isBackend = log.serviceId === 'backend';
    const tag = isBackend
      ? `${colors.magenta}[NESTJS]${colors.reset}`
      : `${colors.red}[ANGULAR]${colors.reset}`;
    const streamColor = log.stream === 'stderr' ? colors.red : colors.reset;
    console.log(`${colors.gray}${time}${colors.reset} ${tag} ${streamColor}${log.text}${colors.reset}`);
  }

  setupKeybindings() {
    if (!process.stdin.isTTY) return;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    this.isRawMode = true;

    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.cleanupAndExit();
        return;
      }

      switch (key.name) {
        case 'q':
          this.cleanupAndExit();
          break;
        case 'b':
          console.log(`\n${colors.yellow}🔄 Restarting Backend...${colors.reset}`);
          this.pm.restartService('backend');
          break;
        case 'f':
          console.log(`\n${colors.yellow}🔄 Restarting Frontend...${colors.reset}`);
          this.pm.restartService('frontend');
          break;
        case 'r':
          console.log(`\n${colors.yellow}🔄 Restarting All Services...${colors.reset}`);
          this.pm.restartAll();
          break;
        case 'o':
          this.openBrowser(`http://localhost:${this.dashboardPort}`);
          break;
      }
    });
  }

  openBrowser(url) {
    openBrowser(url);
  }


  cleanupAndExit() {
    console.log(`\n${colors.yellow}🛑 Shutting down all services gracefully...${colors.reset}`);
    if (this.isRawMode && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.pm.destroy().then(() => {
      console.log(`${colors.green}✓ All processes stopped. Goodbye!${colors.reset}\n`);
      process.exit(0);
    });
  }
}
