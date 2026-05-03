/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    '*.vusercontent.net',
    'vusercontent.net',
  ],
  experimental: {
    reactCompiler: false,
  },
}

module.exports = nextConfig
