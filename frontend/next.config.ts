import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY || '',
  },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: {
    serverComponentsExternalPackages: ['@copilotkit/runtime'],
  },
};

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.testzoo\.local/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'testzoo-api-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
    {
      urlPattern: /\/_next\/static\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'testzoo-static-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 365 },
      },
    },
    {
      urlPattern: /\/images\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'testzoo-images-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 30 },
      },
    },
  ],
});

export default withPWAConfig(nextConfig);