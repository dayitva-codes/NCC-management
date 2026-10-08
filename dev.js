const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';

// 0. Auto-free ports cleanly including full process trees on Windows
function freePort(port) {
  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
          console.log(`\x1b[33m[DEV]\x1b[0m Freed port ${port} (terminated process tree for PID ${pid})`);
        } catch (e) {}
      }
    }
  } catch (err) {
    // Port is already free
  }
}

freePort(8000);
freePort(5173);

// 1. Resolve Python executable
let pythonCmd = 'python';
const venvPythonWin = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');

if (isWin && fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
} else if (!isWin && fs.existsSync(venvPythonUnix)) {
  pythonCmd = venvPythonUnix;
}

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[32m%s\x1b[0m', '   Starting NCC Battalion Management System');
console.log('\x1b[36m%s\x1b[0m', '================================================\n');

let isShuttingDown = false;
let backend = null;
let frontend = null;
let restartAttempts = 0;

// 2. Spawn FastAPI Backend
function startBackend() {
  if (isShuttingDown) return;
  freePort(8000);

  console.log('\x1b[34m[BACKEND]\x1b[0m Starting FastAPI on http://127.0.0.1:8000 ...');

  const uvicornArgs = [
    '-B',
    '-m',
    'uvicorn',
    '--host',
    '127.0.0.1',
    '--port',
    '8000',
    '--reload',
    '--reload-dir',
    'app',
    'app.main:app'
  ];

  backend = spawn(pythonCmd, uvicornArgs, {
    cwd: __dirname,
    shell: false,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
  });

  backend.on('close', (code) => {
    if (isShuttingDown) return;
    if (code !== 0 && restartAttempts < 5) {
      restartAttempts++;
      console.warn(`\x1b[33m[BACKEND]\x1b[0m Exited with code ${code}. Auto-recovering in 1.5s (attempt ${restartAttempts}/5)...`);
      setTimeout(startBackend, 1500);
    } else if (code !== 0) {
      console.error(`\x1b[31m[BACKEND]\x1b[0m Process crashed repeatedly. Shutting down.`);
      shutdown(code || 1);
    }
  });
}

// 3. Spawn Vite Frontend
console.log('\x1b[35m[FRONTEND]\x1b[0m Starting Vite on http://127.0.0.1:5173 ...');
const npmCmd = isWin ? 'npm.cmd' : 'npm';
frontend = spawn(npmCmd, ['run', 'dev', '--prefix', 'frontend'], {
  cwd: __dirname,
  shell: isWin ? true : false,
  stdio: ['ignore', 'inherit', 'inherit']
});

frontend.on('close', (code) => {
  if (code !== 0 && !isShuttingDown) {
    console.error(`\x1b[31m[FRONTEND]\x1b[0m Server exited with code ${code}`);
    shutdown(code || 1);
  }
});

startBackend();

// Cleanup on exit
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[33mShutting down all servers...\x1b[0m');
  if (isWin) {
    try { if (backend && backend.pid) execSync(`taskkill /F /T /PID ${backend.pid}`, { stdio: 'ignore' }); } catch (e) {}
    try { if (frontend && frontend.pid) execSync(`taskkill /F /T /PID ${frontend.pid}`, { stdio: 'ignore' }); } catch (e) {}
  } else {
    try { backend && backend.kill('SIGTERM'); } catch (e) {}
    try { frontend && frontend.kill('SIGTERM'); } catch (e) {}
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
