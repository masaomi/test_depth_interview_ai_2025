import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(), // 現在のディレクトリをルートとして明示的に指定
  },
};

export default nextConfig;
