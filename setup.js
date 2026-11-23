const fs = require('fs');
const https = require('https');
const { execFileSync } = require('child_process');

const releaseApi = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest';
const archivePath = 'xray.zip';

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'pxxl-xray-node',
        Accept: 'application/vnd.github+json'
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return resolve(requestJson(response.headers.location));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`GitHub API returned HTTP ${response.statusCode}`));
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Could not parse GitHub release metadata: ${error.message}`));
        }
      });
    });
    request.setTimeout(30000, () => request.destroy(new Error('GitHub API request timed out')));
    request.on('error', reject);
  });
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'User-Agent': 'pxxl-xray-node', Accept: 'application/octet-stream' }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return resolve(download(response.headers.location, destination));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Xray download returned HTTP ${response.statusCode}`));
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
      response.on('error', reject);
    });
    request.setTimeout(120000, () => request.destroy(new Error('Xray download timed out')));
    request.on('error', reject);
  });
}

async function main() {
  const assetName = process.arch === 'arm64' ? 'Xray-linux-arm64-v8a.zip' : 'Xray-linux-64.zip';
  console.log(`Looking up the latest Xray Linux ${process.arch} release...`);
  const release = await requestJson(releaseApi);
  const asset = release.assets?.find(({ name }) => name === assetName);
  if (!asset) {
    throw new Error(`${assetName} was not found in release ${release.tag_name || 'unknown'}`);
  }

  console.log(`Downloading Xray ${release.tag_name}...`);
  await download(asset.browser_download_url, archivePath);
  if (!fs.existsSync(archivePath) || fs.statSync(archivePath).size < 10000) {
    throw new Error('Downloaded Xray archive is missing or unexpectedly small');
  }

  console.log('Validating and unzipping Xray...');
  execFileSync('unzip', ['-t', archivePath], { stdio: 'inherit' });
  execFileSync('unzip', ['-o', archivePath, 'xray'], { stdio: 'inherit' });
  execFileSync('chmod', ['+x', 'xray']);
  if (!fs.existsSync('xray')) {
    throw new Error('Xray executable was not created by the archive');
  }
  console.log('Xray setup complete.');
}

main().catch((error) => {
  console.error(`Xray setup failed: ${error.message}`);
  process.exitCode = 1;
});
