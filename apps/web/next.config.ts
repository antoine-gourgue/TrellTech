import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@trelltech/shared'],
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'trello-members.s3.amazonaws.com' },
      { protocol: 'https', hostname: '**.trellocdn.com' },
    ],
  },
};

export default nextConfig;
