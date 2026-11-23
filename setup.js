const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const url = 'https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip';
const file = fs.createWriteStream('xray.zip');

console.log('Downloading Xray core...');
https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Download complete. Unzipping...');
    try {
      execSync('unzip -o xray.zip');
      execSync('chmod +x xray');
      console.log('Xray setup complete.');
    } catch (e) {
      console.error('Error unzipping:', e);
    }
  });
});
