'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: 'Como funciona a compra e entrega dos materiais?',
        answer: 'Após a confirmação do pagamento, você recebe automaticamente um e-mail com os links para download dos seus PDFs. Tudo é instantâneo! Você pode baixar quantas vezes precisar dentro do período de acesso.',
    },
    {
        question: 'Os materiais são personalizáveis?',
        answer: 'Sim! Muitos produtos têm opção "Escreva Sua Mensagem" onde você pode adicionar nomes, datas ou mensagens personalizadas. Isso é perfeito para lembrancinhas de batismo, presentes para pioneiros e outras ocasiões especiais.',
    },
    {
        question: 'Em quais idiomas os materiais estão disponíveis?',
        answer: 'Oferecemos materiais em Português, Espanhol e Inglês. Cada produto mostra claramente os idiomas disponíveis. Perfeito para congregações multilíngues ou para presentear irmãos de outras regiões!',
    },
    {
        question: 'Posso usar os materiais para presentear irmãos da congregação?',
        answer: 'Com certeza! Nossos materiais são perfeitos para presentear em ocasiões especiais: batismos, assembleias, visitas do superintendente, inaugurações de salão, escola de pioneiros e muito mais. São presentes práticos e com significado!',
    },
    {
        question: 'Como faço para imprimir os PDFs?',
        answer: 'Todos os PDFs são otimizados para impressão em tamanho A4. Você pode imprimir em casa, em gráficas ou papelarias. Recomendamos papel de boa qualidade (180g ou mais) para lembrancinhas, e papel kraft para um toque especial!',
    },
    {
        question: 'Os materiais são oficiais das Testemunhas de Jeová?',
        answer: 'Não, somos uma loja independente criada por uma irmã (A Rafa Criou) para ajudar irmãos e irmãs a organizarem melhor sua vida cristã e presentearem com amor. Nossos materiais são ferramentas complementares, não publicações oficiais.',
    },
    {
        question: 'Posso revender os materiais?',
        answer: 'Não. Os arquivos são para uso pessoal ou para presentear. A revenda ou redistribuição não autorizada viola os direitos autorais. Se você conhece alguém interessado, indique nossa loja!',
    },
    {
        question: 'E se eu tiver problemas com o download?',
        answer: 'Estamos aqui para ajudar! Entre em contato pelo WhatsApp (11) 99827-4504 ou e-mail arafacriou@gmail.com. Resolvemos rapidamente qualquer dúvida ou dificuldade com downloads.',
    },
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                        Perguntas Frequentes
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Tire suas dúvidas sobre nossos materiais teocráticos digitais
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
                        >

                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left"
                                aria-expanded={openIndex === index}
                            >
                                <span className="font-semibold text-foreground pr-4">
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        'w-5 h-5 text-muted-foreground shrink-0 transition-transform mt-0.5',
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
                                <p className="px-6 pb-4 text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-muted-foreground mb-4">
                        Não encontrou sua resposta?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="https://wa.me/5511998274504"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-6 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#20BD5A] transition-colors font-medium"
                        >
                            WhatsApp: (11) 99827-4504
                        </a>
                        <a
                            href="mailto:arafacriou@gmail.com"
                            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                            E-mail: arafacriou@gmail.com
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Export do array de FAQs para uso no Schema.org
export const faqData = faqs;
