import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  transpilePackages: ['@reclaimprotocol/js-sdk'],
};

export default nextConfig;
