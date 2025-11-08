import type { Metadata } from 'next'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
    title: 'Política de Privacidade - A Rafa Criou',
    description: 'Política de privacidade e proteção de dados.',
}

export default function PrivacidadePage() {
    return (
        <div className="min-h-screen bg-[#F4F4F4]">
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
                <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FFE5A0] to-[#F8D882]">
                    <Image
                        src="/banner_Direitos-Autorais_Trocas_e_Devolucao.webp"
                        alt="Banner Trocas, Reembolsos e Devoluções"
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* Título sobre o banner */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <h1
                            className="font-scripter font-bold uppercase text-center leading-none text-4xl md:text-5xl lg:text-6xl"
                            style={{
                                color: '#FFFFFF',
                                fontFamily: 'Scripter, sans-serif',
                            }}
                        >
                            POLÍTICA DE PRIVACIDADE!
                        </h1>
                    </div>
                </div>


                {/* Conteúdo */}
                <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-6 md:py-10">
                    <Card className="shadow-lg">
                        <CardContent className="p-6 md:p-8 space-y-6 bg-white">
                            {/* Introdução */}
                            <div className="space-y-4">
                                <p className="text-gray-700 leading-relaxed">
                                    Nosso compromisso é com a integridade e a segurança dos dados pessoais dos nossos usuários e clientes. Esta Política de Privacidade aplica-se a todas as interações digitais realizadas em nosso site http://44.218.80.32/byrafaela/byrafaelajw, serviços associados, aplicativos móveis e outras plataformas digitais sob nosso controle.
                                </p>
                                <p className="text-gray-700 leading-relaxed">
                                    Ao acessar e utilizar nossas plataformas, você reconhece e concorda com as práticas descritas nesta política. Nós tratamos a proteção de seus dados pessoais com a máxima seriedade e nos comprometemos a processá-los de forma responsável, transparente e segura.
                                </p>
                            </div>

                            {/* Definições */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Definições
                                </h2>
                                <ul className="space-y-2 text-gray-700">
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span><strong>&quot;Dados Pessoais&quot;</strong> são informações que identificam ou podem identificar uma pessoa natural.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span><strong>&quot;Dados Pessoais Sensíveis&quot;</strong> são informações que revelam características pessoais íntimas, como origem racial, convicções religiosas, opiniões políticas, dados genéticos ou biométricos.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span><strong>&quot;Tratamento de Dados Pessoais&quot;</strong> abrange qualquer operação com Dados Pessoais, como coleta, registro, armazenamento, uso, compartilhamento ou destruição.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span><strong>&quot;Leis de Proteção de Dados&quot;</strong> são todas as leis que regulamentam o Tratamento de Dados Pessoais, incluindo a LGPD (Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/18).</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Dados Coletados */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Dados Coletados e Motivos da Coleta
                                </h2>
                                <p className="text-gray-700">Nós coletamos e processamos os seguintes tipos de dados pessoais:</p>
                                <ul className="space-y-3 text-gray-700">
                                    <li className="pl-4 border-l-2 border-[#FD9555]">
                                        <strong>Informações Fornecidas por Você:</strong> Isso inclui, mas não se limita a, nome, sobrenome, endereço de e-mail, endereço físico, informações de pagamento e quaisquer outras informações que você optar por fornecer ao criar uma conta, fazer uma compra ou interagir com nossos serviços de atendimento ao cliente.
                                    </li>
                                    <li className="pl-4 border-l-2 border-[#FD9555]">
                                        <strong>Informações Coletadas Automaticamente:</strong> Quando você visita nosso site, coletamos automaticamente informações sobre seu dispositivo e sua interação com nosso site. Isso pode incluir dados como seu endereço IP, tipo de navegador, detalhes do dispositivo, fuso horário, páginas visitadas, produtos visualizados, sites ou termos de busca que o direcionaram ao nosso site, e informações sobre como você interage com nosso site.
                                    </li>
                                </ul>
                            </div>

                            {/* Cookies */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Uso de Cookies e Tecnologias de Rastreamento
                                </h2>
                                <p className="text-gray-700">
                                    A Comercial Ampax utiliza cookies, que são pequenos arquivos de texto armazenados no seu dispositivo, e outras tecnologias de rastreamento para melhorar a experiência do usuário em nosso site https://byrafaelaéreirajw.com.br, entender como nossos serviços são utilizados e otimizar nossas estratégias de marketing.
                                </p>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <h3 className="font-semibold text-gray-900">Tipos de Cookies Utilizados:</h3>
                                    <ul className="space-y-2 text-gray-700 text-sm">
                                        <li className="flex gap-2">
                                            <span className="text-[#FD9555]">→</span>
                                            <span><strong>Cookies Essenciais:</strong> Essenciais para o funcionamento do site, permitindo que você navegue e use suas funcionalidades. Sem esses cookies, serviços como carrinho de compras e processamento de pagamento não podem ser fornecidos.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#FD9555]">→</span>
                                            <span><strong>Cookies de Desempenho e Analíticos:</strong> Coletam informações sobre como os visitantes usam o nosso site, quais páginas são visitadas com mais frequência e se eles recebem mensagens de erro. Esses cookies são usados apenas para melhorar o desempenho e a experiência do usuário no site.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#FD9555]">→</span>
                                            <span><strong>Cookies de Funcionalidade:</strong> Permitem que o site lembre de escolhas que você faz (como seu nome de usuário, idioma ou a região em que você está) e forneça recursos aprimorados e mais pessoais.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#FD9555]">→</span>
                                            <span><strong>Cookies de Publicidade e Redes Sociais:</strong> Usados para oferecer anúncios mais relevantes para você e seus interesses. Eles também são usados para limitar o número de vezes que você vê um anúncio, bem como ajudar a medir a eficácia das campanhas publicitárias.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Finalidades */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Finalidades do Processamento de Dados
                                </h2>
                                <p className="text-gray-700">Os dados coletados são utilizados para:</p>
                                <ul className="grid md:grid-cols-2 gap-2 text-gray-700">
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Proporcionar, operar e melhorar nossos serviços e ofertas</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Processar suas transações e enviar notificações relacionadas a suas compras</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Personalizar sua experiência de usuário e recomendar conteúdo ou produtos</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Comunicar informações importantes, ofertas e promoções</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Realizar análises internas para desenvolver e aprimorar nossos serviços</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">✓</span>
                                        <span>Cumprir obrigações legais e regulatórias aplicáveis</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Compartilhamento */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Compartilhamento e Transferência de Dados Pessoais
                                </h2>
                                <p className="text-gray-700">Nós podemos compartilhar seus dados pessoais com terceiros nas seguintes circunstâncias:</p>
                                <ul className="space-y-2 text-gray-700">
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span>Com fornecedores de serviços e parceiros que nos auxiliam nas operações de negócio, desde que estes atuem em conformidade com nossas diretrizes de proteção de dados e com a legislação aplicável;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span>Para cumprir com obrigações legais, responder a processos judiciais, ou proteger nossos direitos e propriedades, bem como a segurança de nossos clientes e do público;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">•</span>
                                        <span>Em caso de reestruturação corporativa, venda, fusão ou outra transferência de ativos, garantindo que a entidade receptora concorde em respeitar a privacidade de seus dados de acordo com uma política equivalente à nossa.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Links Externos */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Links para outros sites e redes sociais
                                </h2>
                                <p className="text-gray-700">
                                    Nossa plataforma pode incluir links para sites externos de parceiros, anunciantes e fornecedores. Clicar nesses links implica que você será direcionado para fora do nosso site, entrando em domínios que seguem suas próprias políticas de privacidade, pelas quais não somos responsáveis.
                                </p>
                                <p className="text-gray-700">
                                    Recomendamos a leitura atenta dessas políticas antes de fornecer qualquer dado pessoal. Da mesma forma, não assumimos responsabilidade pelas práticas de privacidade de terceiros como Facebook, Apple, Google e Microsoft. Aconselhamos você a se informar sobre as políticas de privacidade dessas entidades ao utilizar seus serviços ou aplicativos.
                                </p>
                            </div>

                            {/* Direitos dos Titulares */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Direitos dos Titulares dos Dados
                                </h2>
                                <p className="text-gray-700">Você possui diversos direitos em relação aos seus dados pessoais, incluindo:</p>
                                <ul className="space-y-2 text-gray-700">
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">→</span>
                                        <span>O direito de acesso, retificação ou exclusão de seus dados pessoais sob nossa posse;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">→</span>
                                        <span>O direito de limitar ou se opor ao nosso processamento de seus dados;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">→</span>
                                        <span>O direito à portabilidade de dados;</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-[#FD9555] font-bold">→</span>
                                        <span>O direito de retirar seu consentimento a qualquer momento, quando o processamento for baseado em consentimento.</span>
                                    </li>
                                </ul>
                                <p className="text-gray-700">
                                    Para exercer esses direitos, entre em contato conosco através de <a href="mailto:ampax@ampax.com.br" className="text-[#FD9555] hover:underline font-semibold">ampax@ampax.com.br</a>.
                                </p>
                            </div>

                            {/* Segurança */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Segurança dos Dados
                                </h2>
                                <p className="text-gray-700">
                                    Implementamos medidas de segurança técnica e organizacional para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, é importante notar que nenhum sistema é completamente seguro. Nos comprometemos a notificar você e qualquer autoridade aplicável de quaisquer brechas de segurança de acordo com a legislação vigente.
                                </p>
                            </div>

                            {/* Alterações */}
                            <div className="space-y-3">
                                <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-[#FED466] pb-2">
                                    Alterações na Política de Privacidade
                                </h2>
                                <p className="text-gray-700">
                                    Nossa Política de Privacidade pode ser atualizada periodicamente. A versão mais atual será sempre publicada em nosso site, indicando a data da última revisão. Encorajamos você a revisar regularmente nossa política para estar sempre informado sobre como estamos protegendo seus dados.
                                </p>
                            </div>

                            {/* Contato */}
                            <div className="bg-gradient-to-r from-[#FED466]/20 to-[#FD9555]/20 border-l-4 border-[#FD9555] p-6 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                    Contato
                                </h2>
                                <p className="text-gray-700 leading-relaxed">
                                    Se tiver dúvidas ou preocupações sobre nossa Política de Privacidade ou práticas de dados, por favor, não hesite em nos contatar em{' '}
                                    <a href="mailto:byrafaelapereirajw@gmail.com" className="text-[#FD9555] hover:underline font-semibold">
                                        byrafaelapereirajw@gmail.com
                                    </a>
                                    . Estamos comprometidos em resolver quaisquer questões relacionadas à privacidade de nossos usuários e clientes.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div >
        </div>
    )
}
