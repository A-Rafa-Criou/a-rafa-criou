"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface MercadoPagoFormProps {
    appliedCoupon: {
        code: string;
        discount: number;
        type: string;
        value: string;
    } | null;
    finalTotal: number;
}

// Interfaces seguindo a documentação oficial do Mercado Pago
interface MercadoPagoSDK {
    fields: {
        create: (type: string, options?: Record<string, unknown>) => FieldInstance;
        createCardToken: (data: CardholderData) => Promise<{ id: string }>;
    };
    getIdentificationTypes: () => Promise<IdentificationType[]>;
    getPaymentMethods: (options: { bin: string }) => Promise<{ results: PaymentMethod[] }>;
    getIssuers: (options: { paymentMethodId: string; bin: string }) => Promise<Issuer[]>;
    getInstallments: (options: { amount: string; bin: string; paymentTypeId: string }) => Promise<InstallmentOption[]>;
}

interface FieldInstance {
    mount: (elementId: string) => FieldInstance;
    on: (event: string, callback: (data: Record<string, unknown>) => void) => void;
    update: (options: Record<string, unknown>) => void;
}

interface CardholderData {
    cardholderName: string;
    identificationType: string;
    identificationNumber: string;
}

interface IdentificationType {
    id: string;
    name: string;
}

interface PaymentMethod {
    id: string;
    settings: Array<{
        card_number: Record<string, unknown>;
        security_code: Record<string, unknown>;
    }>;
    additional_info_needed: string[];
    issuer?: { id: string; name: string };
}

interface Issuer {
    id: string;
    name: string;
}

interface InstallmentOption {
    payer_costs: Array<{
        installments: number;
        recommended_message: string;
    }>;
}

declare global {
    interface Window {
        MercadoPago: new (publicKey: string) => MercadoPagoSDK;
    }
}

export function MercadoPagoForm({ appliedCoupon, finalTotal }: MercadoPagoFormProps) {
    const { data: session } = useSession();
    const { items, clearCart } = useCart();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const mpRef = useRef<MercadoPagoSDK | null>(null);
    const cardNumberFieldRef = useRef<FieldInstance | null>(null);
    const mountedRef = useRef(false);
    const currentBinRef = useRef<string | null>(null);

    // Buscar chave pública (client-side ou da API)
    const getPublicKey = async (): Promise<string | null> => {
        // Tentar pegar do client-side primeiro (mais rápido)
        const clientKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
        if (clientKey) return clientKey;

        // Se não tiver NEXT_PUBLIC_, buscar da API
        // (necessário quando usa MERCADOPAGO_PUBLIC_KEY_PROD sem prefixo)
        try {
            const res = await fetch('/api/mercado-pago/config');
            if (!res.ok) return null;
            const data = await res.json();
            return data.publicKey || null;
        } catch (error) {
            console.error('[MercadoPago] Erro ao buscar chave pública:', error);
            return null;
        }
    };

    // Carregar SDK quando mostrar formulário
    useEffect(() => {
        if (!showForm) return;

        const loadSDK = async () => {
            const key = await getPublicKey();
            
            if (!key) {
                console.error('[MercadoPago] Chave pública não configurada');
                setErrorMessage('Mercado Pago não está configurado. Configure NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ou MERCADOPAGO_PUBLIC_KEY_PROD.');
                setSdkLoaded(true);
                return;
            }

            setPublicKey(key);

            if (window.MercadoPago && !mountedRef.current) {
                setSdkLoaded(true);
                setTimeout(initializeFields, 300);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => {
                setSdkLoaded(true);
                setTimeout(initializeFields, 300);
            };
            script.onerror = () => {
                console.error('[MercadoPago] Erro ao carregar SDK');
                setErrorMessage('Erro ao carregar Mercado Pago. Verifique sua conexão.');
                setSdkLoaded(true);
            };
            document.body.appendChild(script);
        };

        loadSDK();

        return () => {
            mountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showForm, finalTotal]);

    // Inicializar campos seguindo documentação oficial (Core Methods)
    const initializeFields = async () => {
        if (mountedRef.current) return;

        let key = publicKey;
        if (!key) {
            key = await getPublicKey();
        }
        
        if (!key) {
            console.error('[MercadoPago] Chave pública não encontrada ao inicializar campos');
            setErrorMessage('Configuração do Mercado Pago ausente.');
            return;
        }
        
        if (!window.MercadoPago) {
            console.error('[MercadoPago] SDK não carregado');
            setErrorMessage('SDK do Mercado Pago não disponível.');
            return;
        }

        const cardNumberEl = document.getElementById('form-checkout__cardNumber');
        if (!cardNumberEl) {
            setTimeout(initializeFields, 300);
            return;
        }

        try {
            const mp = new window.MercadoPago(key);
            mpRef.current = mp;

            // Criar campos de cartão com iframes (documentação oficial)
            const cardNumberField = mp.fields.create('cardNumber', {
                placeholder: "Número do cartão"
            }).mount('form-checkout__cardNumber');
            cardNumberFieldRef.current = cardNumberField;

            mp.fields.create('expirationDate', {
                placeholder: "MM/AA"
            }).mount('form-checkout__expirationDate');

            const securityCodeField = mp.fields.create('securityCode', {
                placeholder: "CVV"
            }).mount('form-checkout__securityCode');

            // Obter tipos de documento
            await loadIdentificationTypes(mp);

            // Listener para mudança de BIN (primeiros 6 dígitos do cartão)
            cardNumberField.on('binChange', async (data: Record<string, unknown>) => {
                const bin = data.bin as string;

                const paymentMethodEl = document.getElementById('paymentMethodId') as HTMLInputElement;

                if (!bin && paymentMethodEl?.value) {
                    clearSelects();
                    paymentMethodEl.value = "";
                }

                if (bin && bin !== currentBinRef.current) {
                    try {
                        const { results } = await mp.getPaymentMethods({ bin });
                        const paymentMethod = results[0];

                        if (paymentMethodEl) {
                            paymentMethodEl.value = paymentMethod.id;
                        }

                        // Atualizar validações dos campos (melhora validação cardNumber e securityCode)
                        if (paymentMethod.settings?.[0]) {
                            const { card_number, security_code } = paymentMethod.settings[0];
                            if (card_number) {
                                cardNumberField.update({ settings: card_number });
                            }
                            if (security_code) {
                                securityCodeField.update({ settings: security_code });
                            }
                        }

                        // Atualizar banco emissor
                        await updateIssuer(mp, paymentMethod, bin);

                        // Atualizar parcelas
                        await updateInstallments(mp, bin);
                    } catch (error) {
                        console.error('[MP] Erro ao obter método de pagamento:', error);
                    }
                }

                currentBinRef.current = bin;
            });

            mountedRef.current = true;
            console.log('[MP] ✅ Campos inicializados com Core Methods');
        } catch (error) {
            console.error('[MP] Erro ao inicializar:', error);
            setErrorMessage('Erro ao inicializar pagamento');
        }
    };

    const loadIdentificationTypes = async (mp: MercadoPagoSDK) => {
        try {
            const identificationTypes = await mp.getIdentificationTypes();
            const select = document.getElementById('form-checkout__identificationType') as HTMLSelectElement;

            if (select) {
                select.innerHTML = '<option value="" disabled selected>Tipo de documento</option>';
                identificationTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('[MP] Erro ao carregar tipos de documento:', error);
        }
    };

    const updateIssuer = async (mp: MercadoPagoSDK, paymentMethod: PaymentMethod, bin: string) => {
        const issuerSelect = document.getElementById('form-checkout__issuer') as HTMLSelectElement;
        if (!issuerSelect) return;

        try {
            let issuers = paymentMethod.issuer ? [paymentMethod.issuer] : [];

            if (paymentMethod.additional_info_needed?.includes('issuer_id')) {
                issuers = await mp.getIssuers({ paymentMethodId: paymentMethod.id, bin });
            }

            issuerSelect.innerHTML = '';
            if (issuers.length === 0) {
                issuerSelect.innerHTML = '<option value="" selected>Banco emissor</option>';
            } else {
                issuers.forEach(issuer => {
                    const option = document.createElement('option');
                    option.value = issuer.id;
                    option.textContent = issuer.name;
                    if (issuers.length === 1) option.selected = true;
                    issuerSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('[MP] Erro ao carregar bancos:', error);
        }
    };

    const updateInstallments = async (mp: MercadoPagoSDK, bin: string) => {
        const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement;
        if (!installmentsSelect) return;

        try {
            const installments = await mp.getInstallments({
                amount: finalTotal.toFixed(2),
                bin,
                paymentTypeId: 'credit_card'
            });

            const payerCosts = installments[0]?.payer_costs || [];

            installmentsSelect.innerHTML = '';
            payerCosts.forEach(cost => {
                const option = document.createElement('option');
                option.value = cost.installments.toString();
                option.textContent = cost.recommended_message;
                installmentsSelect.appendChild(option);
            });
        } catch (error) {
            console.error('[MP] Erro ao carregar parcelas:', error);
        }
    };

    const clearSelects = () => {
        const issuerSelect = document.getElementById('form-checkout__issuer') as HTMLSelectElement;
        const installmentsSelect = document.getElementById('form-checkout__installments') as HTMLSelectElement;
        
        if (issuerSelect) {
            issuerSelect.innerHTML = '<option value="" disabled selected>Banco emissor</option>';
        }
        if (installmentsSelect) {
            installmentsSelect.innerHTML = '<option value="" disabled selected>Parcelas</option>';
        }
    };

    const formatDocument = (value: string) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        // CPF: 000.000.000-00
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        
        // CNPJ: 00.000.000/0000-00
        return numbers
            .slice(0, 14)
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDocument(e.target.value);
        e.target.value = formatted;
    };    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.user?.id || !mpRef.current) {
            setErrorMessage("Usuário não autenticado");
            return;
        }

        if (items.length === 0) {
            setErrorMessage("Carrinho vazio");
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const cardholderName = (document.getElementById('form-checkout__cardholderName') as HTMLInputElement)?.value;
            const identificationType = (document.getElementById('form-checkout__identificationType') as HTMLSelectElement)?.value;
            const identificationNumberRaw = (document.getElementById('form-checkout__identificationNumber') as HTMLInputElement)?.value;
            // Remove formatação (pontos, traços, barras) antes de enviar
            const identificationNumber = identificationNumberRaw?.replace(/\D/g, '') || '';
            const email = (document.getElementById('form-checkout__email') as HTMLInputElement)?.value;
            const paymentMethodId = (document.getElementById('paymentMethodId') as HTMLInputElement)?.value;
            const issuer = (document.getElementById('form-checkout__issuer') as HTMLSelectElement)?.value;
            const installments = (document.getElementById('form-checkout__installments') as HTMLSelectElement)?.value;

            if (!cardholderName || !identificationType || !identificationNumber || !paymentMethodId || !issuer || !installments) {
                setErrorMessage("Por favor, preencha todos os campos");
                setIsProcessing(false);
                return;
            }

            // Validar documento
            if (identificationNumber.length < 11) {
                setErrorMessage("CPF/CNPJ inválido");
                setIsProcessing(false);
                return;
            }

            // Criar token do cartão (Core Methods)
            const tokenData = await mpRef.current.fields.createCardToken({
                cardholderName,
                identificationType,
                identificationNumber
            });

            const response = await fetch('/api/mercado-pago/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        productId: item.productId,
                        variationId: item.variationId || null,
                        quantity: item.quantity,
                    })),
                    userId: (session?.user as { id?: string })?.id || null,
                    email: email || session?.user?.email,
                    couponCode: appliedCoupon?.code || null,
                    discount: appliedCoupon?.discount || 0,
                    token: tokenData.id,
                    paymentMethodId: paymentMethodId,
                    installments: parseInt(installments),
                    issuer: issuer,
                    payer: {
                        email: email || session?.user?.email || '',
                        identification: {
                            type: identificationType,
                            number: identificationNumber
                        }
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[MP] Erro da API:', error);
                throw new Error(error.error || error.message || 'Erro ao processar pagamento');
            }

            const data = await response.json();
            clearCart();

            if (data.status === 'approved') {
                router.push(`/obrigado?orderId=${data.orderId}&paymentId=${data.paymentId}`);
            } else if (data.status === 'rejected' || data.status === 'cancelled') {
                router.push(`/pagamento-falhou?orderId=${data.orderId}`);
            } else {
                router.push(`/pagamento-pendente?orderId=${data.orderId}&paymentId=${data.paymentId}`);
            }
        } catch (error) {
            // Tratar erros específicos do SDK
            if (error && typeof error === 'object' && 'cause' in error) {
                const sdkError = error as { cause?: Array<{ code: string; description: string }> };
                if (sdkError.cause && Array.isArray(sdkError.cause) && sdkError.cause.length > 0) {
                    const errorMessages = sdkError.cause.map(e => e.description || e.code).join(', ');
                    setErrorMessage(errorMessages);
                    setIsProcessing(false);
                    return;
                }
            }
            
            setErrorMessage(error instanceof Error ? error.message : 'Erro ao processar pagamento');
            setIsProcessing(false);
        }
    };

    if (!session?.user?.id) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 text-center">
                Faça login para finalizar a compra
            </div>
        );
    }

    if (!showForm) {
        return (
            <Button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full bg-[#009EE3] hover:bg-[#0084C2] text-white font-semibold h-11"
            >
                Pagar com Cartão de Crédito
            </Button>
        );
    }

    if (!sdkLoaded) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#009EE3] mx-auto mb-4" />
                <p className="text-gray-500">Carregando formulário...</p>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                    #form-checkout__cardNumber iframe,
                    #form-checkout__expirationDate iframe,
                    #form-checkout__securityCode iframe {
                        height: 20px !important;
                        border: none !important;
                    }
                    #form-checkout__cardNumber,
                    #form-checkout__expirationDate,
                    #form-checkout__securityCode {
                        display: flex !important;
                        align-items: center !important;
                        min-height: 42px !important;
                    }
                `
            }} />
            <form id="form-checkout" onSubmit={handleSubmit} className="space-y-6">
                {/* Seção: Dados do Cartão */}
                <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">Dados do Cartão</h3>

                    {/* Campos de cartão com iframes (Core Methods) */}
                    <div>
                        <label htmlFor="form-checkout__cardNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Número do Cartão
                        </label>
                        <div
                            id="form-checkout__cardNumber"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="form-checkout__expirationDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Validade
                            </label>
                            <div
                                id="form-checkout__expirationDate"
                                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="form-checkout__securityCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                                CVV
                            </label>
                            <div
                                id="form-checkout__securityCode"
                                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="form-checkout__cardholderName" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nome do Titular
                        </label>
                        <input
                            type="text"
                            id="form-checkout__cardholderName"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all uppercase"
                            placeholder="COMO ESTÁ NO CARTÃO"
                        />
                    </div>
                </div>

                {/* Seção: Dados Pessoais */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Dados Pessoais</h3>

                    <div>
                        <label htmlFor="form-checkout__email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            E-mail
                        </label>
                        <input
                            type="email"
                            id="form-checkout__email"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all"
                            defaultValue={session?.user?.email || ''}
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] gap-3">
                        <div>
                            <label htmlFor="form-checkout__identificationType" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Tipo
                            </label>
                            <select
                                id="form-checkout__identificationType"
                                defaultValue=""
                                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all bg-white"
                            >
                                <option value="" disabled>
                                    Selecione...
                                </option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="form-checkout__identificationNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Número do Documento
                            </label>
                            <input
                                type="text"
                                id="form-checkout__identificationNumber"
                                onChange={handleDocumentChange}
                                maxLength={18}
                                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all"
                                placeholder="000.000.000-00"
                            />
                        </div>
                    </div>
                </div>

                {/* Seção: Informações de Pagamento */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Informações de Pagamento</h3>

                    <div>
                        <label htmlFor="form-checkout__issuer" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Banco Emissor
                        </label>
                        <select
                            id="form-checkout__issuer"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all bg-white"
                        >
                            <option value="" disabled selected>Aguarde...</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="form-checkout__installments" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Número de Parcelas
                        </label>
                        <select
                            id="form-checkout__installments"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:border-transparent transition-all bg-white"
                        >
                            <option value="" disabled selected>Aguarde...</option>
                        </select>
                    </div>

                    {/* Campos ocultos para dados do pagamento */}
                    <input type="hidden" id="paymentMethodId" />
                </div>

                {errorMessage && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isProcessing || items.length === 0}
                    className="w-full bg-[#009EE3] hover:bg-[#0084C2] text-white font-semibold h-11 text-base shadow-sm transition-all"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando pagamento...
                        </>
                    ) : (
                        `Pagar R$ ${finalTotal.toFixed(2).replace('.', ',')}`
                    )}
                </Button>
            </form>
        </>
    );
}
