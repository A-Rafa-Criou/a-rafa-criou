'use client';

import { useEffect } from 'react';
import HeroSection from '@/components/sections/HeroSection';
import BenefitsSection from '@/components/sections/BenefitsSection';
import FeaturedProducts from '@/components/sections/FeaturedProducts';
import MobileBottomMenu from '@/components/sections/MobileBottomMenu';
import { generateWebsiteSchema, generateOrganizationSchema } from '@/components/seo/metadata';

export default function HomePage() {
  const handleHomeClick = () => {
    // Scroll suave para o topo da página (apenas no cliente)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Adicionar Schema.org JSON-LD
  useEffect(() => {
    // Schema.org para Website e Organization
    const websiteSchema = generateWebsiteSchema();
    const organizationSchema = generateOrganizationSchema();

    // Criar ou atualizar script de schema
    const updateSchema = (id: string, schema: object) => {
      let script = document.getElementById(id) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script') as HTMLScriptElement;
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    };

    updateSchema('schema-website', websiteSchema);
    updateSchema('schema-organization', organizationSchema);

    return () => {
      // Cleanup schemas quando o componente desmontar
      const websiteScript = document.getElementById('schema-website');
      const orgScript = document.getElementById('schema-organization');
      if (websiteScript) websiteScript.remove();
      if (orgScript) orgScript.remove();
    };
  }, []);

  return (
    <>
      <main className="w-full pb-20 md:pb-0">
        {/* Hero Section */}
        <HeroSection />

        {/* Seção de Benefícios */}
        <BenefitsSection />

        {/* Seção de Produtos Destacados */}
        <FeaturedProducts />
      </main>

      {/* Menu fixo inferior apenas no mobile */}
      <MobileBottomMenu onHomeClick={handleHomeClick} />
    </>
  );
}