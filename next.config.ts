import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 루트 디렉토리 설정 (상위 디렉토리 lockfile 경고 방지)
  turbopack: {
    root: __dirname,
  },
  // 루트 경로에서 /lead-manager로 리다이렉트
  async redirects() {
    return [
      {
        source: '/',
        destination: '/lead-manager',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
