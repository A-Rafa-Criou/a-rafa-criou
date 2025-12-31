
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import ShadcnSpinner from './ShadcnSpinner';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

interface PixResponse {
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
}

interface PixCheckoutProps {
    appliedCoupon?: {
        code: string
        discount: number
        type: string
        value: string
    } | null
}

const PixCheckout: React.FC<PixCheckoutProps> = ({ appliedCoupon }) => {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pix, setPix] = useState<PixResponse | null>(null);
    const [orderStatus, setOrderStatus] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const { items, clearCart } = useCart();
    // Resetar Pix e status ao mudar itens do carrinho
    useEffect(() => {
        setPix(null);
        setOrderStatus(null);
        setError(null);
        setCopied(false);
    }, [items]);

    // Envia todos os itens do carrinho
    const description = items.length === 1 ? items[0].name : 'Compra de PDF';

    // Função para copiar código PIX
    const handleCopyPixCode = async () => {
        if (!pix?.qr_code) return;

        try {
            await navigator.clipboard.writeText(pix.qr_code);
            setCopied(true);

            // Resetar após 2 segundos
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Erro ao copiar código PIX:', err);
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = pix.qr_code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            } catch (e) {
                console.error('Fallback de cópia também falhou:', e);
            }
            document.body.removeChild(textArea);
        }
    };

    const handlePixPayment = async () => {
        // ✅ Verificar se está autenticado
        if (!session) {
            // Salvar redirecionamento
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('redirectAfterLogin', '/carrinho')
            }
            // Redirecionar para login
            window.location.href = '/auth/login?callbackUrl=/carrinho'
            return
        }

        setLoading(true);
        setError(null);
        setPix(null);
        setOrderStatus(null);
        try {
            if (!items || items.length === 0) {
                setError('Carrinho vazio ou produto não encontrado.');
                setLoading(false);
                return;
            }
            const res = await fetch('/api/mercado-pago/pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    description,
                    couponCode: appliedCoupon?.code || null,
                    discount: appliedCoupon?.discount || 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || (data.details ? JSON.stringify(data.details) : 'Erro ao criar pagamento Pix'));

            setPix(data);
            setOrderStatus('pending'); // ✅ Definir status como pending assim que o Pix for gerado
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erro desconhecido ao criar pagamento Pix');
            }
        } finally {
            setLoading(false);
        }
    };

    // Função para verificar manualmente o status do pagamento
    const handleCheckStatus = async () => {
        if (!pix?.payment_id) return;

        setChecking(true);
        setError(null);
        try {
            const res = await fetch(`/api/mercado-pago/check-payment?paymentId=${pix.payment_id}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao verificar pagamento');
            }

            if (data.database?.status) {
                setOrderStatus(data.database.status);

                if (data.database.status === 'completed') {
                    // ✅ Limpar carrinho, cupom e redirecionar
                    clearCart();
                    localStorage.removeItem('appliedCoupon');
                    router.push(`/obrigado?payment_id=${pix.payment_id}`);
                } else if (['cancelled', 'refunded', 'rejected'].includes(data.database.status)) {
                    router.push('/erro');
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erro ao verificar status');
            }
        } finally {
            setChecking(false);
        }
    };

    // Consulta periódica ao status do pedido
    useEffect(() => {
        if (pix?.payment_id) {
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/orders/status?paymentId=${pix.payment_id}`);
                    const data = await res.json();
                    if (data.status) {
                        setOrderStatus(data.status);
                        if (data.status === 'completed') {
                            clearInterval(interval);
                            // ✅ Limpar carrinho, cupom e redirecionar
                            clearCart();
                            localStorage.removeItem('appliedCoupon');
                            router.push(`/obrigado?payment_id=${pix.payment_id}`);
                        } else if (['cancelled', 'refunded', 'rejected'].includes(data.status)) {
                            clearInterval(interval);
                            router.push('/erro');
                        }
                    }
                } catch { }
            }, 4000); // consulta a cada 4s
            return () => clearInterval(interval);
        }
    }, [pix?.payment_id, router, clearCart]);

    return (
        <div className="bg-[#F4F4F4] p-6 rounded-lg shadow-md flex flex-col items-center">
            <Button
                className="bg-[#FED466] text-black px-4 py-2 rounded font-bold mb-4 hover:bg-[#FD9555]"
                onClick={handlePixPayment}
                disabled={loading || [
                    'completed', 'cancelled', 'refunded', 'rejected', 'processing'
                ].includes(orderStatus || '')}
                aria-disabled={(loading || [
                    'completed', 'cancelled', 'refunded', 'rejected', 'processing'
                ].includes(orderStatus || '')) ? 'true' : 'false'}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gerando Pix...</span>
                    </div>
                ) : 'Pagar com Pix'}
            </Button>
            {error && <div className="text-red-600 mb-2">{error}</div>}

            {/* Spinner enquanto aguardando pagamento (só aparece DEPOIS de gerar o Pix) */}
            {pix && !loading && orderStatus === 'pending' && (
                <ShadcnSpinner label="Aguardando pagamento..." />
            )}

            {/* QR code só aparece se não estiver pago/cancelado/refundado/rejeitado */}
            {pix && !loading && orderStatus === 'pending' && (
                <div className="flex flex-col items-center">
                    <Image
                        src={`data:image/png;base64,${pix.qr_code_base64}`}
                        alt={t('a11y.qrCodeAlt')}
                        width={192}
                        height={192}
                        className="w-48 h-48 mb-2 border-2 border-[#FED466]"
                    />
                    <div
                        className="text-xs text-gray-700 break-all bg-white p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors relative group w-full"
                        onClick={handleCopyPixCode}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleCopyPixCode();
                            }
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="flex-1 font-mono text-[11px] leading-relaxed">{pix.qr_code}</span>
                            <div className="flex-shrink-0">
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                )}
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 text-center">
                            {copied ? '✓ Código copiado!' : 'Clique para copiar o código PIX'}
                        </div>
                    </div>
                    {orderStatus && (
                        <div className="mt-2 text-sm font-semibold text-gray-700">Status: {orderStatus}</div>
                    )}
                    {/* Botão para verificar manualmente */}
                    <Button
                        onClick={handleCheckStatus}
                        disabled={checking}
                        variant="outline"
                        className="mt-4"
                    >
                        {checking ? 'Verificando...' : 'Já paguei, verificar agora'}
                    </Button>
                    {/* Mostrar Payment ID para debugging */}
                    <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                        <div className="font-semibold mb-1">ID do Pagamento:</div>
                        <div className="font-mono break-all">{pix.payment_id}</div>
                        <div className="text-gray-600 mt-2 text-[10px]">
                            Use este ID para verificar manualmente se necessário
                        </div>
                    </div>
                </div>
            )}
            {/* Status final */}
            {orderStatus && [
                'completed', 'cancelled', 'refunded', 'rejected'
            ].includes(orderStatus) && (
                    <div className="mt-4 text-lg font-bold text-gray-700">
                        {orderStatus === 'completed' && 'Pagamento aprovado!'}
                        {orderStatus === 'cancelled' && 'Pagamento cancelado.'}
                        {orderStatus === 'refunded' && 'Pagamento reembolsado.'}
                        {orderStatus === 'rejected' && 'Pagamento rejeitado.'}
                    </div>
                )}
        </div>
    );
};

export default PixCheckout;
