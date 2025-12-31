'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 루트 페이지 - /lead-manager로 리다이렉트
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/lead-manager');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#000',
      color: '#fff',
      fontSize: '18px'
    }}>
      리다이렉트 중...
    </div>
  );
}
