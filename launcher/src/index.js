import { ProcessManager } from './process-manager.js';
import { DashboardServer } from './dashboard-server.js';
import { CliDashboard } from './cli-dashboard.js';
import { openBrowser } from './open-browser.js';

async function main() {
  const pm = new ProcessManager();
  const dashboardPort = process.env.LAUNCHER_PORT || 4000;
  const dashboardServer = new DashboardServer(pm, dashboardPort);
  const cli = new CliDashboard(pm, dashboardPort);

  try {
    // 1. Start Web Dashboard Server
    await dashboardServer.start();
    
    // 2. Init Process Manager
    pm.init();

    // 3. Start CLI UI
    cli.start();

    // 4. Automatically open Dashboard in browser
    const dashboardUrl = `http://localhost:${dashboardPort}`;
    console.log(`🌐 Opening Dashboard in browser: ${dashboardUrl}`);
    openBrowser(dashboardUrl);

    // 5. Automatically start both Backend and Frontend services
    console.log('🚀 Spawning Angular Frontend and NestJS Backend services...');
    await pm.startAll();


    // 5. Handle process signals
    const onExit = async () => {
      console.log('\n[LAUNCHER] Termination signal received. Stopping services...');
      await pm.destroy();
      await dashboardServer.stop();
      process.exit(0);
    };

    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);

  } catch (err) {
    console.error('Fatal error starting launcher:', err);
    process.exit(1);
  }
}

main();
