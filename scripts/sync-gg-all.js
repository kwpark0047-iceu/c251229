// sync-gg-all.js – 하나의 명령으로 모든 경기도 데이터 API를 동기화
// 사용법: node scripts/sync-gg-all.js

const { exec } = require('child_process');
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

// 각 데이터 별 스크립트 경로 (project root 기준)
const tasks = [
  { name: 'clinics', script: 'scripts/sync-gg-clinics.js' },
  { name: 'hospitals', script: 'scripts/sync-gg-hospitals.js' },
  { name: 'universities', script: 'scripts/sync-gg-univ.js' },
  { name: 'jncl-univ', script: 'scripts/sync-gg-jncl-univ.js' },
  { name: 'restaurants', script: 'scripts/sync-gg-restaurants.js' },
];

function runTask(task) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ${task.name} sync...`);
    exec(`node ${task.script}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${task.name} sync failed:`, error.message);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(`✅ ${task.name} sync completed`);
      console.log(stdout);
      resolve();
    });
  });
}

(async () => {
  for (const task of tasks) {
    try {
      await runTask(task);
    } catch (e) {
      console.error('⏹️ Stopping further sync due to error.');
      break;
    }
  }
  console.log('🎉 All sync tasks finished (or stopped on error).');
})();
