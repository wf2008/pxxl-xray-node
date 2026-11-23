const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

const uuid = process.env.UUID || 'd342d11e-d424-4583-b36e-524ab1f0afa4';
const wsPath = process.env.WSPATH || '/randompath';
const port = process.env.PORT || 8080;

const config = {
  log: { loglevel: "warning" },
  inbounds: [{
    port: port,
    protocol: "vless",
    settings: { clients: [{ id: uuid }], decryption: "none" },
    streamSettings: {
      network: "ws",
      wsSettings: { path: wsPath }
    }
  }],
  outbounds: [{ protocol: "freedom", settings: {} }]
};

fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
console.log('Starting Xray...');
const xray = spawn('./xray', ['-c', 'config.json']);

xray.stdout.on('data', (data) => console.log(`Xray: ${data}`));
xray.stderr.on('data', (data) => console.error(`Xray Error: ${data}`));

// Network test
console.log("Testing connection...");
https.get('https://www.google.com', (res) => {
  console.log(`[SUCCESS] Google responded with status code: ${res.statusCode}`);
}).on('error', (err) => {
  console.log(`[FAILED] Could not connect: ${err.message}`);
});
