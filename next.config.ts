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
