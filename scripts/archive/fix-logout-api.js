const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The current handleSignOut is what I replaced earlier. Let's find it.
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const handleSignOut = async () => {'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('};'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      // 1. 서버 측 API를 호출하여 쿠키 완벽 삭제 및 세션 종료
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // 2. 클라이언트 측 로컬 스토리지 정리
      localStorage.clear();
      
      // 3. 브라우저 캐시 우회를 위해 완전히 새 페이지로 로드
      window.location.href = '/auth';
    } catch (e) {
      console.error('로그아웃 중 예외 발생:', e);
      localStorage.clear();
      window.location.href = '/auth';
    }
  };`;

  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully updated handleSignOut to use API route');
} else {
  console.log('Could not find handleSignOut function bounds.');
}
