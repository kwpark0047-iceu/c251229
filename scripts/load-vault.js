// Load API vault and inject credentials into process.env
// This script should be required at the top of sync scripts after dotenv config.
const fs = require('fs');
const path = require('path');
const vaultPath = path.resolve(__dirname, '../config/api-vault.json');
if (fs.existsSync(vaultPath)) {
  try {
    const raw = fs.readFileSync(vaultPath, 'utf8');
    const vault = JSON.parse(raw);
    Object.entries(vault).forEach(([key, value]) => {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
    console.log('🔐 API vault loaded');
  } catch (e) {
    console.error('Failed to parse api-vault.json:', e.message);
  }
} else {
  console.warn('API vault file not found at', vaultPath);
}
