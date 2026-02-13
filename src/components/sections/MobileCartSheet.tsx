'use client'

import React from 'react'
import { useCart } from '@/contexts/cart-context'
import { useCurrency } from '@/contexts/currency-context'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface MobileCartSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MobileCartSheet({ open, onOpenChange }: MobileCartSheetProps) {
    const { items, totalItems, totalPrice, removeItem, syncPrices } = useCart()
    const { convertPrice, formatPrice } = useCurrency()
    const { t } = useTranslation('common')
    const router = useRouter()
    const hasSyncedRef = React.useRef(false)

    // ⚡ Sincronizar preços APENAS quando abre (não quando fecha)
    React.useEffect(() => {
        if (open && items.length > 0 && !hasSyncedRef.current) {
            console.log('⚡ [MobileCartSheet] Sheet aberto pela primeira vez, sincronizando...')
            hasSyncedRef.current = true
            syncPrices().then(() => {
                console.log('✅ [MobileCartSheet] Sincronização concluída!')
            }).catch((error) => {
                console.error('❌ [MobileCartSheet] Erro na sincronização:', error)
            })
        }

        // Reset quando fecha para sincronizar na próxima abertura
        if (!open) {
            hasSyncedRef.current = false
        }
    }, [open, items.length, syncPrices])

    const handleCheckout = () => {
        onOpenChange(false)
        router.push('/carrinho')
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[90vw] sm:w-95 p-0 flex flex-col" aria-describedby="cart-description">
                <SheetTitle className="sr-only">{t('cart.title', 'Carrinho de Compras')}</SheetTitle>
                <p id="cart-description" className="sr-only">
                    {t('cart.description', 'Visualize e gerencie os produtos no seu carrinho de compras')}
                </p>

                {/* Header */}
                <header className="p-6 border-b bg-linear-to-r from-[#FD9555] to-[#FED466]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-white" aria-hidden="true" />
                            <h2 className="text-lg font-bold text-white">
                                {t('cart.title', 'Carrinho')}
                            </h2>
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 text-sm font-bold px-3 py-1 mx-4">
                            {totalItems} {totalItems === 1 ? t('cart.item', 'item') : t('cart.items', 'itens')}
                        </Badge>
                    </div>
                </header>

                {/* Content */}
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" aria-hidden="true" />
                        <p className="text-gray-700 mb-2 font-semibold">{t('cart.empty', 'Seu carrinho está vazio')}</p>
                        <p className="text-sm text-gray-500">{t('cart.emptyDescription', 'Adicione produtos para continuar')}</p>
                    </div>
                ) : (
                    <>
                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" role="list">
                            {items.map((item) => (
                                <article
                                    key={item.id}
                                    className="relative flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                                    role="listitem"
                                >
                                    {/* Botão de Excluir - Acessível */}
                                    <Button
                                        type='button'
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 z-10 transition-colors cursor-pointer"
                                        onClick={() => removeItem(item.id)}
                                        aria-label={t('cart.removeItem', `Remover ${item.name} do carrinho`)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>

                                    {/* Image */}
                                    <div className="relative w-20 h-20 shrink-0 bg-white rounded-md overflow-hidden border border-gray-200">
                                        <Image
                                            src={item.image || '/file.svg'}
                                            alt={t('cart.itemImage', `Imagem de ${item.name}`)}
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="font-bold text-sm text-gray-900 mb-1.5 line-clamp-2">
                                            {item.name}
                                        </h3>

                                        {/* Atributos selecionados */}
                                        {item.attributes && item.attributes.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {item.attributes.map((attr, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="bg-[#FED466]/20 text-gray-900 border-[#FED466]/50 text-xs px-2 py-0.5"
                                                    >
                                                        <span className="opacity-70">{attr.name}:</span>
                                                        <span className="ml-1 font-semibold">{attr.value}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-600 mb-2 font-medium">{item.variationName}</p>
                                        )}

                                        {/* Badge de Promoção */}
                                        {item.hasPromotion && item.promotion && (
                                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 mb-2 w-fit">
                                                {item.promotion.name.replace(/\s*[-–—:]\s*\d{1,2}\/\d{1,2}[\s\S]*$/i, '').trim()}
                                            </Badge>
                                        )}

                                        <div className="flex items-baseline gap-2">
                                            {/* Preço Original (se houver promoção) */}
                                            {item.hasPromotion && item.originalPrice && (
                                                <p className="text-xs text-gray-500 line-through">
                                                    {formatPrice(convertPrice(item.originalPrice))}
                                                </p>
                                            )}

                                            {/* Preço Final */}
                                            <p className={`text-base font-bold ${item.hasPromotion ? 'text-red-600' : 'text-[#FD9555]'}`}>
                                                {formatPrice(convertPrice(item.price))}
                                            </p>
                                            {item.quantity > 1 && (
                                                <span className="text-xs text-gray-500">
                                                    x{item.quantity}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Footer */}
                        <footer className="border-t p-4 space-y-3 bg-white shadow-lg">
                            {/* Total */}
                            <div className="flex items-center justify-between bg-[#FED466]/20 px-4 py-3 rounded-lg">
                                <span className="font-bold text-gray-900">{t('cart.total', 'Total')}:</span>
                                <span className="text-xl font-bold text-[#FD9555]">{formatPrice(convertPrice(totalPrice))}</span>
                            </div>

                            {/* Checkout Button */}
                            <Button
                                onClick={handleCheckout}
                                className="w-full bg-linear-to-r from-[#FD9555] to-[#FD9555]/90 hover:from-[#FD9555]/90 hover:to-[#FD9555] text-white font-bold py-3 text-base shadow-md hover:shadow-lg transition-all min-h-12 cursor-pointer"
                            >
                                {t('cart.checkout', 'Finalizar Compra')}
                            </Button>

                            {/* Continue Shopping */}
                            <Button
                                type='button'
                                onClick={() => {
                                    onOpenChange(false)
                                    window.location.href = '/produtos'
                                }}
                                className="w-full text-sm font-semibold text-gray-900 border-2 hover:bg-gray-50 transition-colors min-h-11 cursor-pointer"
                            >
                                {t('cart.continueShopping', 'Continuar Comprando')}
                            </Button>
                        </footer>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
