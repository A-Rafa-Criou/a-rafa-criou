'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export interface CartItem {
    id: string
    productId: string
    variationId: string
    name: string
    price: number
    originalPrice?: number
    hasPromotion?: boolean
    promotion?: {
        name: string
        discountType: string
        discountValue: number
    }
    variationName: string
    image: string
    quantity: number
    attributes?: { name: string; value: string }[]
}

interface CartContextType {
    items: CartItem[]
    totalItems: number
    totalPrice: number
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (id: string) => void
    updateItem: (id: string, updates: Partial<Omit<CartItem, 'id' | 'productId' | 'quantity'>>) => void
    updateItemPrice: (productId: string, variationId: string, newPrice: number) => void
    clearCart: () => void
    cartSheetOpen: boolean
    setCartSheetOpen: (open: boolean) => void
    openCartSheet: () => void
    syncPrices: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const [cartSheetOpen, setCartSheetOpen] = useState(false)
    const openCartSheet = () => setCartSheetOpen(true)

    // Hidratar carrinho do localStorage apenas no cliente
    useEffect(() => {
        setIsHydrated(true)
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart))
            } catch {
                // Silenciosamente resetar carrinho se houver dados corrompidos
                setItems([])
            }
        }
    }, [])

    // Salvar carrinho no localStorage sempre que mudar (apenas após hidratação)
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('cart', JSON.stringify(items))
        }
    }, [items, isHydrated])

    // Sincronizar preços com o banco de dados
    const syncPrices = useCallback(async () => {
        console.log('🔄 [syncPrices] Iniciando sincronização...')
        
        // Usar setState com função para acessar items mais recente
        setItems(currentItems => {
            console.log('📦 [syncPrices] Items atuais no carrinho:', currentItems.length)
            
            if (currentItems.length === 0) {
                console.log('⚠️ [syncPrices] Carrinho vazio, nada para sincronizar')
                return currentItems
            }
            
            // Executar sync em background sem bloquear
            (async () => {
                try {
                    console.log('🌐 [syncPrices] Buscando dados atualizados para', currentItems.length, 'itens...')
                    
                    // Buscar preços atualizados para todos os itens do carrinho
                    const updates = await Promise.all(
                        currentItems.map(async (item, index) => {
                    try {
                        // Se tem variação, buscar preço da variação
                        // Se não tem variação, buscar do produto (não deveria acontecer)
                        const url = item.variationId
                            ? `/api/variations/${item.variationId}`
                            : `/api/products/by-slug?slug=${item.productId}`

                        console.log(`🔍 [syncPrices] Item ${index + 1}/${currentItems.length}: Buscando ${url}`)

                        const response = await fetch(url)
                        if (!response.ok) {
                            console.error(`❌ [syncPrices] Erro HTTP ${response.status} ao buscar ${url}`)
                            return null
                        }

                        const data = await response.json()
                        console.log(`📦 [syncPrices] Dados recebidos para item ${index + 1}:`, {
                            name: item.name,
                            price: data.price,
                            originalPrice: data.originalPrice,
                            hasPromotion: data.hasPromotion,
                            promotion: data.promotion
                        })

                        const currentPrice = parseFloat(data.price || item.price)
                        const originalPrice = data.originalPrice ? parseFloat(data.originalPrice) : undefined
                        const hasPromotion = data.hasPromotion || false
                        const promotion = data.promotion || undefined

                        // PROTEÇÃO: Se item tem promoção ativa e dados novos não têm, manter promoção atual
                        if (item.hasPromotion && item.originalPrice && !hasPromotion) {
                            console.log(`🛡️ [syncPrices] Protegendo promoção ativa de ${item.name}`)                            
                            return {
                                productId: item.productId,
                                variationId: item.variationId,
                                newPrice: item.price,  // Manter preço promocional
                                originalPrice: item.originalPrice,
                                hasPromotion: true,
                                promotion: item.promotion
                            }
                        }

                        // Retornar atualização com dados mais recentes
                        return {
                            productId: item.productId,
                            variationId: item.variationId,
                            newPrice: currentPrice,
                            originalPrice,
                            hasPromotion,
                            promotion
                        }
                    } catch (error) {
                        console.error(`❌ [syncPrices] Erro ao buscar preço do produto ${item.productId}:`, error)
                        return null
                    }
                })
            )

                    // Aplicar atualizações de preço - SEMPRE aplica, mesmo que não haja mudança de preço
                    const priceUpdates = updates.filter(u => u !== null)
                    console.log(`✅ [syncPrices] Recebidos ${priceUpdates.length} atualizações`)
                    
                    if (priceUpdates.length > 0) {
                        console.log('💾 [syncPrices] Aplicando atualizações ao carrinho...')
                        setItems(current =>
                            current.map(item => {
                                const update = priceUpdates.find(
                                    u => u!.productId === item.productId && u!.variationId === item.variationId
                                )
                                if (update) {
                                    console.log('✨ [syncPrices] Item atualizado:', {
                                        name: item.name,
                                        oldPrice: item.price,
                                        newPrice: update.newPrice,
                                        oldHasPromotion: item.hasPromotion,
                                        newHasPromotion: update.hasPromotion,
                                        promotion: update.promotion
                                    })
                                }
                                return update ? { 
                                    ...item, 
                                    price: update.newPrice,
                                    originalPrice: update.originalPrice,
                                    hasPromotion: update.hasPromotion,
                                    promotion: update.promotion
                                } : item
                            })
                        )
                        console.log('✅ [syncPrices] Sincronização concluída com sucesso!')
                    } else {
                        console.log('ℹ️ [syncPrices] Nenhuma atualização necessária')
                    }
                } catch (error) {
                    console.error('❌ [syncPrices] Erro ao sincronizar preços do carrinho:', error)
                }
            })();
            
            return currentItems;
        });
    }, [])

    // REMOVIDO: Sincronização automática após hidratação causava conflitos
    // A página do carrinho é responsável por chamar syncPrices quando necessário

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
        setItems(current => {
            const existingItem = current.find(item =>
                item.productId === newItem.productId && item.variationId === newItem.variationId
            )
            if (existingItem) {
                // Se já existe, não adiciona novamente
                return current
            } else {
                // Se não existe, adiciona novo item com quantidade 1
                return [...current, { ...newItem, quantity: 1 }]
            }
        })
    }, [])

    const removeItem = useCallback((id: string) => {
        setItems(current => current.filter(item => item.id !== id))
    }, [])


    const updateItem = useCallback((id: string, updates: Partial<Omit<CartItem, 'id' | 'productId' | 'quantity'>>) => {
        setItems(current =>
            current.map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        )
    }, [])

    const updateItemPrice = useCallback((productId: string, variationId: string, newPrice: number) => {
        setItems(current =>
            current.map(item =>
                item.productId === productId && item.variationId === variationId
                    ? { ...item, price: newPrice }
                    : item
            )
        )
    }, [])

    const clearCart = useCallback(() => {
        setItems([])
    }, [])

    return (
        <CartContext.Provider value={{
            items,
            totalItems,
            totalPrice,
            addItem,
            removeItem,
            updateItem,
            updateItemPrice,
            clearCart,
            cartSheetOpen,
            setCartSheetOpen,
            openCartSheet,
            syncPrices
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (!context) {
        throw new Error('useCart deve ser usado dentro de um CartProvider')
    }
    return context
}