/** @type {import('next').NextConfig} */
const target = process.env.API_PROXY_TARGET || 'http://localhost:8000';

const nextConfig = {
  basePath: process.env.NEXT_BASE_PATH,
  async rewrites() {
    return [
      // Browser calls /api/...; Next proxies to your FastAPI backend.
      { source: `${process.env.NEXT_PUBLIC_API_URL}/:path*`, destination: `${target}/:path*` },
    ];
  },
};
export default nextConfig;