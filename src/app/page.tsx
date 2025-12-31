import { redirect } from 'next/navigation';

// 정적 생성 방지 - 항상 서버에서 실행
export const dynamic = 'force-dynamic';

/**
 * 루트 페이지 - /lead-manager로 리다이렉트
 */
export default function Home() {
  redirect('/lead-manager');
}
