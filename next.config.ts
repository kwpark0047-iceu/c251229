import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
