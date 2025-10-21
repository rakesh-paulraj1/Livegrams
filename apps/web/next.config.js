/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure tldraw and its subpackages are transpiled to avoid duplicate instances
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
