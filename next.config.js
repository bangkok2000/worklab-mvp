/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Next.js 14 App Router, body size limits are handled differently
  // We need to configure this in the route handlers themselves
  // This config is mainly for Pages Router compatibility
  experimental: {
    // Enable server actions if needed
  },
  
  // Cache busting and headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        // Static assets can be cached longer
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Generate build timestamp for cache busting
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

module.exports = nextConfig;