import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true, // Habilitar compressão gzip
  poweredByHeader: false, // Remover header X-Powered-By por segurança
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
    formats: ['image/webp', 'image/avif'], // Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Aumenta o limite para 500MB para PDFs grandes
    },
    optimizeCss: true, // Otimizar CSS em produção
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react'], // Otimizar imports
  },
  async redirects() {
    return [
      // Redirecionamentos admin
      {
        source: '/admin/clientes',
        destination: '/admin/usuarios',
        permanent: true,
      },
      // WordPress -> Next.js
      {
        source: '/produto',
        destination: '/produtos',
        permanent: true,
      },
      {
        source: '/loja',
        destination: '/produtos',
        permanent: true,
      },
      {
        source: '/shop',
        destination: '/produtos',
        permanent: true,
      },
      {
        source: '/minha-conta',
        destination: '/conta',
        permanent: true,
      },
      {
        source: '/my-account',
        destination: '/conta',
        permanent: true,
      },
      {
        source: '/carrinho-de-compras',
        destination: '/carrinho',
        permanent: true,
      },
      {
        source: '/cart',
        destination: '/carrinho',
        permanent: true,
      },
      {
        source: '/finalizar-compra',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/checkout-2',
        destination: '/checkout',
        permanent: true,
      },
      // Páginas informacionais
      {
        source: '/sobre-rafaela',
        destination: '/sobre',
        permanent: true,
      },
      {
        source: '/sobre-nos',
        destination: '/sobre',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/sobre',
        permanent: true,
      },
      {
        source: '/contato-2',
        destination: '/contato',
        permanent: true,
      },
      {
        source: '/fale-conosco',
        destination: '/contato',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/contato',
        permanent: true,
      },
      // WordPress admin
      {
        source: '/wp-admin',
        destination: '/',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/wp-login',
        destination: '/auth/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
