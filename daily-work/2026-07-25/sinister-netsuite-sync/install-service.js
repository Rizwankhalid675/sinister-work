const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Sinister Diesel Sync',
  description: 'Miva to NetSuite sync service',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  wait: 2,
  grow: 0.5
});

svc.on('install', () => {
  svc.start();
  console.log('Service installed and started.');
});

svc.on('start', () => {
  console.log('Service started successfully.');
});

svc.on('error', (err) => {
  console.log('Service error:', err);
});

svc.install();
