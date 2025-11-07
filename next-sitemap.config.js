/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
  generateRobotsTxt: false, // Já temos robots.txt customizado
  generateIndexSitemap: true,
  sitemapSize: 7000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: [
    '/admin/*',
    '/conta/*',
    '/api/*',
    '/checkout',
    '/carrinho',
    '/obrigado',
    '/pago',
    '/auth/*',
    '/_not-found',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/conta', '/api', '/checkout', '/carrinho'],
      },
    ],
  },
  // Adicionar URLs dinâmicas
  additionalPaths: async () => {
    const result = [];

    // URLs estáticas importantes
    const staticPages = [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
      { loc: '/produtos', changefreq: 'daily', priority: 0.9 },
      { loc: '/contato', changefreq: 'monthly', priority: 0.6 },
      { loc: '/sobre', changefreq: 'monthly', priority: 0.6 },
      { loc: '/favoritos', changefreq: 'weekly', priority: 0.5 },
    ];

    staticPages.forEach(page => {
      result.push({
        loc: page.loc,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: new Date().toISOString(),
      });
    });

    return result;
  },
  transform: async (config, path) => {
    // Customizar prioridades baseado no path
    let priority = config.priority;
    let changefreq = config.changefreq;

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.startsWith('/produtos/')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/produto/')) {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.startsWith('/categorias/')) {
      priority = 0.7;
      changefreq = 'weekly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      alternateRefs: [
        {
          href: `https://arafacriou.com.br${path}?lang=pt`,
          hreflang: 'pt-BR',
        },
        {
          href: `https://arafacriou.com.br${path}?lang=en`,
          hreflang: 'en',
        },
        {
          href: `https://arafacriou.com.br${path}?lang=es`,
          hreflang: 'es',
        },
      ],
    };
  },
};
