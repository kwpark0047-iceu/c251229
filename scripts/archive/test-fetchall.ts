import { fetchAllLeads } from '../src/app/lead-manager/api';
import { Settings } from '../src/app/lead-manager/types';

async function test() {
  const settings: Settings = {
    apiKey: '{"seoul":"6d7a6b6c766b777033346b53716455"}',
    regionCode: '6110000',
    corsProxy: '',
    searchType: 'license_date'
  };
  
  // Test with last 10 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 10);
  
  console.log('Testing fetchAllLeads...');
  const res = await fetchAllLeads(settings, startDate, endDate, (c: number, t: number, msg?: string) => console.log(msg), 'HEALTH', ['01_01_02_P']);
  
  console.log('Result:', res.success, res.totalCount, res.leads?.length);
}

test().catch(console.error);
