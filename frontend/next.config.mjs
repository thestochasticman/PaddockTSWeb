/** @type {import('next').NextConfig} */
const target = process.env.API_PROXY_TARGET || 'http://localhost:8000';

const nextConfig = {
  async rewrites() {
    return [
      // Browser calls /api/...; Next proxies to your FastAPI backend.
      { source: '/api/:path*', destination: `${target}/:path*` },
    ];
  },
};
export default nextConfig;