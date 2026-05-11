const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // 로그아웃 처리
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

const replacement = `  // 로그아웃 처리
  const handleSignOut = async () => {
    // 모든 브라우저 쿠키(Supabase 세션 쿠키 포함)를 강제 삭제하는 유틸리티
    const clearCookies = () => {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
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

// Because I just injected the `target` in the last step, I know it's in the file.
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully added clearCookies logic to handleSignOut');
} else {
  console.log('Could not find the target string!');
}
