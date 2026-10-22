import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['leaflet', 'react-leaflet'],
};

export default nextConfig;
