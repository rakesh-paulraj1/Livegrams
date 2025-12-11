/** @type {import('next').NextConfig} */
const nextConfig = {
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
      }
};

export default nextConfig;
