/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ['192.168.29.232'],
  transpilePackages: [
    'tldraw',
    '@tldraw/editor',
    '@tldraw/state',
    '@tldraw/state-react',
    '@tldraw/store',
    '@tldraw/utils',
    '@tldraw/validate',
    '@tldraw/tlschema',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  outputFileTracingIncludes: {
    '/': [
      './node_modules/@prisma/client/**/*',
      './node_modules/.prisma/client/**/*',
      '../../packages/db/node_modules/@prisma/client/**/*',
      '../../packages/db/node_modules/.prisma/client/**/*',
      '../../packages/db/src/generated/prisma/**/*',
    ],
  },
};

export default nextConfig;