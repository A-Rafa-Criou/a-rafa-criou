'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export interface CartItem {
    id: string
    productId: string
    variationId: string
    name: string
    price: number
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
        if (items.length === 0) return

        try {
            // Buscar preços atualizados para todos os itens do carrinho
            const updates = await Promise.all(
                items.map(async (item) => {
                    try {
                        const url = item.variationId
                            ? `/api/products/${item.productId}/variations/${item.variationId}`
                            : `/api/products/${item.productId}`
                        
                        const response = await fetch(url)
                        if (!response.ok) return null

                        const data = await response.json()
                        const currentPrice = parseFloat(data.price || item.price)

                        // Retornar atualização apenas se o preço mudou
                        if (currentPrice !== item.price) {
                            return {
                                productId: item.productId,
                                variationId: item.variationId,
                                newPrice: currentPrice
                            }
                        }
                        return null
                    } catch (error) {
                        console.error(`Erro ao buscar preço do produto ${item.productId}:`, error)
                        return null
                    }
                })
            )

            // Aplicar atualizações de preço
            const priceUpdates = updates.filter(u => u !== null)
            if (priceUpdates.length > 0) {
                setItems(current =>
                    current.map(item => {
                        const update = priceUpdates.find(
                            u => u!.productId === item.productId && u!.variationId === item.variationId
                        )
                        return update ? { ...item, price: update.newPrice } : item
                    })
                )
                console.log(`🔄 ${priceUpdates.length} preço(s) atualizado(s) no carrinho`)
            }
        } catch (error) {
            console.error('Erro ao sincronizar preços do carrinho:', error)
        }
    }, [items])

    // Sincronizar preços quando o carrinho for hidratado
    useEffect(() => {
        if (isHydrated && items.length > 0) {
            syncPrices()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated])

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