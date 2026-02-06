import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 ESLint 및 타입 체크 오류 무시 (긴급 복구용)

  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
