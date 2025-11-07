import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cd1a164db8d1fd883dfb3e2c8a94023c.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
    ],
    qualities: [75, 90, 100], // Configuração de qualidades suportadas
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Aumenta o limite para 100MB para PDFs grandes
    },
  },
  async redirects() {
    return [
      {
        source: '/admin/clientes',
        destination: '/admin/usuarios',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
