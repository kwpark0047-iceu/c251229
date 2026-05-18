const axios = require('axios');

const API_KEY = '6d7a6b6c766b777033346b53716455';
const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/LOCALDATA_010102/1/5`;

async function main() {
  try {
    const response = await axios.get(url);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error fetching:', err.message);
  }
}

main();
