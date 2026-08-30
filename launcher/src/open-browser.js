import { exec } from 'node:child_process';

export function openBrowser(url) {
  const platform = process.platform;
  let command = '';

  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      // Silently catch if browser cannot be launched
    }
  });
}
