import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['leaflet', 'react-leaflet'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
