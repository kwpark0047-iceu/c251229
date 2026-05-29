// test_api.js - fetch all leads from LocalData API (aggregates pagination)
// Usage: node test_api.js
const fetch = require('node-fetch');

// Adjust these parameters as needed
const serviceId = '01_01_02_P'; // example service ID
const regionCode = '6110000'; // example region code
const startDate = '20240101';
const endDate = '20240131';
const pageSize = 100; // same as server default

async function fetchAllLeads() {
  let pageIndex = 1;
  let allLeads = [];
  while (true) {
    const body = {
      serviceId,
      regionCode,
      startDate,
      endDate,
      pageIndex,
      pageSize,
    };
    const response = await fetch('http://localhost:3000/api/localdata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('Error fetching page', pageIndex, ':', response.status);
      break;
    }
    const data = await response.json();
    if (!data.success) {
      console.error('API error:', data.error);
      break;
    }
    const { leads, totalCount } = data;
    console.log(`Fetched ${leads.length} leads (page ${pageIndex})`);
    allLeads = allLeads.concat(leads);
    if (leads.length < pageSize) {
      // last page
      break;
    }
    pageIndex++;
  }
  console.log('=== All leads fetched ===');
  console.log('Total leads:', allLeads.length);
  // Optionally write to file
  // require('fs').writeFileSync('all_leads.json', JSON.stringify(allLeads, null, 2));
}

fetchAllLeads().catch(err => console.error('Unexpected error:', err));
