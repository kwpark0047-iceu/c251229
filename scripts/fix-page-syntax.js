const fs = require('fs');
const file = 'd:/c251229/src/app/lead-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // 로그아웃 처리
  // 로그아웃 처리
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
  };

    try {
      const result = await signOut();
      if (result.success) {
        // Next.js 캐시 및 미들웨어 상태 초기화를 위해 하드 리로드 수행
        window.location.href = '/auth';
      } else {
        console.error('로그아웃 에러:', result.message);
        localStorage.clear();
        clearCookies();
        window.location.href = '/auth';
      }
    } catch (e) {
      console.error('로그아웃 중 예외 발생:', e);
      localStorage.clear();
      clearCookies();
      window.location.href = '/auth';
    }
  };`;

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

// Try direct replacement
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed syntax error in page.tsx by direct replacement');
} else {
  // Line based fallback
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes('// 로그아웃 처리'));
  if (startIdx !== -1) {
    // Delete up to the end of the malformed block
    const nextLine = lines.findIndex((l, idx) => idx > startIdx + 15 && l.includes('};'));
    if (nextLine !== -1) {
      lines.splice(startIdx, nextLine - startIdx + 1, replacement);
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      console.log('Fixed syntax error in page.tsx by line range replacement');
    } else {
      console.log('Could not find end of malformed block');
    }
  } else {
    console.log('Could not find start of malformed block');
  }
}
