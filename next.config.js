/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Next.js 14 App Router, body size limits are handled differently
  // We need to configure this in the route handlers themselves
  // This config is mainly for Pages Router compatibility
  experimental: {
    // Enable server actions if needed
  },
};

module.exports = nextConfig;