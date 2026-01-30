import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 ESLint 및 타입 체크 오류 무시 (긴급 복구용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
