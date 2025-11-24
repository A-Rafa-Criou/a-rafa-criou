'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { generateFAQSchema } from '@/components/seo/metadata';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const { t } = useTranslation('common');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Construir FAQs traduzidas com useMemo
  const faqs: FAQItem[] = useMemo(() => [
    {
      question: t('faq.q1.question', 'Como funciona a compra e entrega dos materiais?'),
      answer: t('faq.q1.answer', 'Após a confirmação do pagamento, você recebe automaticamente um e-mail com os links para download dos seus PDFs. Tudo é instantâneo! Você pode baixar quantas vezes precisar dentro do período de acesso.'),
    },
    {
      question: t('faq.q2.question', 'Os materiais são personalizáveis?'),
      answer: t('faq.q2.answer', 'Sim! Muitos produtos têm opção "Escreva" onde você pode adicionar nomes, datas ou mensagens personalizadas. Isso é perfeito para lembrancinhas de batismo, presentes para pioneiros e outras ocasiões especiais.'),
    },
    {
      question: t('faq.q3.question', 'Em quais idiomas os materiais estão disponíveis?'),
      answer: t('faq.q3.answer', 'Oferecemos materiais em Português, Espanhol e Inglês. Cada produto mostra claramente os idiomas disponíveis. Perfeito para congregações multilíngues ou para presentear irmãos de outras regiões!'),
    },
    {
      question: t('faq.q4.question', 'Posso usar os materiais para presentear irmãos da congregação?'),
      answer: t('faq.q4.answer', 'Com certeza! Nossos materiais são perfeitos para presentear em ocasiões especiais: batismos, assembleias, visitas do superintendente, inaugurações de salão, escola de pioneiros e muito mais. São presentes práticos e com significado!'),
    },
    {
      question: t('faq.q5.question', 'Como faço para imprimir os PDFs?'),
      answer: t('faq.q5.answer', 'Todos os PDFs são otimizados para impressão em tamanho A4. Você pode imprimir em casa, em gráficas ou papelarias. Recomendamos papel de boa qualidade (180g ou mais) para lembrancinhas, e papel kraft para um toque especial!'),
    },
    {
      question: t('faq.q6.question', 'Os materiais são oficiais das Testemunhas de Jeová?'),
      answer: t('faq.q6.answer', 'Não, somos uma loja independente criada por uma irmã (Rafaela Pereira) para ajudar irmãos e irmãs a organizarem melhor sua vida cristã e presentearem com amor. Nossos materiais são ferramentas complementares, não publicações oficiais.'),
    },
    {
      question: t('faq.q7.question', 'Posso revender os materiais?'),
      answer: t('faq.q7.answer', 'Não. Os arquivos são para uso pessoal ou para presentear. A revenda ou redistribuição não autorizada viola os direitos autorais. Se você conhece alguém interessado, indique nossa loja!'),
    },
    {
      question: t('faq.q8.question', 'E se eu tiver problemas com o download?'),
      answer: t('faq.q8.answer', 'Estamos aqui para ajudar! Entre em contato pelo WhatsApp (11) 99827-4504 ou e-mail arafacriou@gmail.com. Resolvemos rapidamente qualquer dúvida ou dificuldade com downloads.'),
    },
  ], [t]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Adicionar FAQ Schema ao head
  useEffect(() => {
    const faqSchema = generateFAQSchema(faqs);
    
    let script = document.getElementById('schema-faq') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script') as HTMLScriptElement;
      script.id = 'schema-faq';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(faqSchema);

    return () => {
      const faqScript = document.getElementById('schema-faq');
      if (faqScript) faqScript.remove();
    };
  }, [faqs]);

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      {/* Banner */}
      <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
        <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FED466] to-[#FD9555]">
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <h1 className="font-Scripter text-white font-bold uppercase text-center leading-none text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              {t('faq.title', 'PERGUNTAS FREQUENTES')}
            </h1>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-6 md:py-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12">
          
          {/* Introdução */}
          <div className="text-center mb-8 md:mb-12">
            <p className="text-lg text-gray-700 leading-relaxed">
              {t('faq.subtitle', 'Tire suas dúvidas sobre nossos materiais teocráticos digitais')}
            </p>
          </div>

          {/* Lista de FAQs */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left"
                  aria-expanded={openIndex === index ? 'true' : 'false'}
                >
                  <span className="font-bold text-gray-900 pr-4 text-base sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-[#FD9555] shrink-0 transition-transform mt-0.5',
                      openIndex === index && 'rotate-180'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300',
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <p className="px-6 pb-5 text-gray-700 leading-relaxed text-sm sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA de Contato */}
          <div className="mt-12 bg-gradient-to-r from-[#FED466] to-[#FD9555] rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-white font-bold text-lg sm:text-xl mb-6">
              {t('faq.stillHaveQuestions', 'Ainda tem dúvidas?')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/5511998274504"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#25D366] text-white rounded-full hover:bg-[#20BD5A] transition-colors font-bold text-base shadow-lg"
              >
                WhatsApp: (11) 99827-4504
              </a>
              <a
                href="mailto:arafacriou@gmail.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors font-bold text-base shadow-lg"
              >
                E-mail: arafacriou@gmail.com
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
