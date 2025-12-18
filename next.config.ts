import type { NextConfig } from 'next';

// Suppress noisy Turbopack HMR ping messages during development so they don't spam the terminal.
if (process.env.NODE_ENV === 'development') {
  process.on('unhandledRejection', reason => {
    try {
      // Reason can be an Error or a string
      const message =
        typeof reason === 'string' ? reason : (reason as any)?.message || String(reason);
      if (
        typeof message === 'string' &&
        message.includes('unrecognized HMR message') &&
        message.includes('"event":"ping"')
      ) {
        // ignore Turbopack HMR unrecognized ping spam in dev
        return;
      }
    } catch (e) {
      // fallback: ignore parsing errors
    }
    // rethrow to default handlers so other issues are noticed
    // eslint-disable-next-line no-console
    console.error('Unhandled rejection during dev:', reason);
  });
}

const nextConfig: NextConfig = {
  turbopack: {
    // Explicit root for Turbopack to avoid inferring multiple lockfiles in parent dirs
    root: process.cwd(),
  },
  compress: true, // Habilitar compressão gzip
  poweredByHeader: false, // Remover header X-Powered-By por segurança
  reactStrictMode: true,
  productionBrowserSourceMaps: false, // Desabilitar source maps em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
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
    qualities: [50, 60, 75, 90], // 50 mobile, 60 produtos, 75 desktop, 90 alta qualidade
    formats: ['image/webp', 'image/avif'], // Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Removido 2048 e 3840
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // Cache de 1 ano para imagens otimizadas
    dangerouslyAllowSVG: false, // Segurança: bloquear SVG externo
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Aumenta o limite para 100MB para PDFs grandes
      allowedOrigins: ['*'],
    },
    optimizeCss: true, // Otimizar CSS em produção
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react'], // Otimizar imports
    // Webpack 5 com module federation para melhor code splitting
    webpackBuildWorker: true,
  },
  webpack: (config, { isServer }) => {
    // Otimizar chunks de CSS para reduzir blocking time
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // CSS crítico inline, resto async
            styles: {
              name: 'styles',
              test: /\.css$/,
              chunks: 'all',
              enforce: true,
              priority: 20,
            },
            // Vendor libs separadas para melhor cache
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module: any) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)(?:[\\/]|$)/
                )?.[1];
                return `vendor.${packageName?.replace('@', '')}`;
              },
              priority: 10,
            },
            // Commons para código compartilhado
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
        // Minimize JS para navegadores modernos (remove polyfills)
        minimize: true,
      };
    }
    return config;
  },
  async redirects() {
    return [
      // Redirecionamentos admin
      {
        source: '/admin/clientes',
        destination: '/admin/usuarios',
        permanent: true,
      },
      // Redirect afiliados
      {
        source: '/seja-afiliado',
        destination: '/afiliados-da-rafa',
        permanent: true,
      },
      // WordPress -> Next.js
      {
        source: '/produto',
        destination: '/produtos',
        permanent: true,
      },
      {
        source: '/produto/:slug*',
        destination: '/produtos/:slug*',
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
  async headers() {
    return [
      // Cache agressivo para API de produtos públicos (reduz Fast Origin Transfer)
      {
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=21600, stale-while-revalidate=43200',
          },
        ],
      },
      // Cache de imagens otimizadas do Next.js
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache de assets estáticos
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache de fontes
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache de ícones e imagens estáticas
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache de páginas de produtos
      {
        source: '/produtos/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        ],
      },
      // Cache de API de categorias
      {
        source: '/api/categories',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=43200, stale-while-revalidate=86400',
          },
        ],
      },
      // Cache de API de atributos
      {
        source: '/api/attributes',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=43200, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
