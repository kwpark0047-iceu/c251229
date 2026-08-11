const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // 로그아웃 처리
  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/auth');
      router.refresh();
    }
  };`;

const replacement = `  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // Next.js 캐시 및 미들웨어 상태 초기화를 위해 하드 리로드 수행
        window.location.href = '/auth';
      } else {
        console.error('로그아웃 에러:', result.message);
        localStorage.clear();
        window.location.href = '/auth';
      }
    } catch (e) {
      console.error('로그아웃 중 예외 발생:', e);
      localStorage.clear();
      window.location.href = '/auth';
    }
  };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced handleSignOut in page.tsx');
} else {
  // Try line by line if there is a mismatch
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes('const handleSignOut = async () => {'));
  if (startIdx !== -1) {
    lines.splice(startIdx - 1, 8, replacement);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Successfully replaced handleSignOut by index in page.tsx');
  } else {
    console.log('Could not find handleSignOut');
  }
}
