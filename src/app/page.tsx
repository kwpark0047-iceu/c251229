import { redirect } from 'next/navigation';

/**
 * 루트 페이지 - /lead-manager로 리다이렉트
 */
export default function Home() {
  redirect('/lead-manager');
}
