// init-app.js - Nap App Lark (config init) voi App Secret day qua stdin KHONG kem \n
// (PowerShell pipe vao --app-secret-stdin se them \r\n lam hong secret -> dung Node).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '_app.json'), 'utf8'));
if (!app.APP_ID || !app.APP_SECRET) {
  console.error('!! Thieu APP_ID / APP_SECRET trong _app.json (ADMIN can dien truoc).');
  process.exit(1);
}
const args = ['config', 'init', '--app-id', app.APP_ID, '--brand', app.BRAND || 'lark', '--app-secret-stdin'];
const ch = spawn('lark-cli.cmd', args, { stdio: ['pipe', 'inherit', 'inherit'], shell: true, windowsHide: true });
ch.stdin.write(app.APP_SECRET); // khong them newline
ch.stdin.end();
ch.on('close', (c) => process.exit(c || 0));
