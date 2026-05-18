const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ data, headers: res.headers, statusCode: res.statusCode }); });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Fetching lead-manager page...');
    const res = await fetchUrl('https://c251229.vercel.app/lead-manager');
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    // Find all script tags in the returned HTML
    const scriptRegex = /<script\s+src="([^"]+)"/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(res.data)) !== null) {
      scripts.push(match[1]);
    }
    
    console.log('Found scripts:', scripts);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
