/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained Node server for Electron packaging.
  output: 'standalone',
  // Disable Next.js telemetry for offline/desktop use
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  // Allow the local backend to serve uploaded images via /uploads/*
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:3001'
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
