'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface FavoriteProduct {
    id: string
    slug: string
    name: string
    price: number
    image: string
    addedAt: number
}

interface FavoritesContextType {
    favorites: FavoriteProduct[]
    addFavorite: (product: Omit<FavoriteProduct, 'addedAt'>) => void
    removeFavorite: (productId: string) => void
    isFavorite: (productId: string) => boolean
    toggleFavorite: (product: Omit<FavoriteProduct, 'addedAt'>) => void
    totalFavorites: number
    clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const STORAGE_KEY = 'arafa_favorites'

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
    const [isInitialized, setIsInitialized] = useState(false)

    // Carregar favoritos do localStorage ao montar
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored) as FavoriteProduct[]
                setFavorites(parsed)
            }
        } catch (error) {
            console.error('[Favorites] Erro ao carregar:', error)
        } finally {
            setIsInitialized(true)
        }
    }, [])

    // Salvar favoritos no localStorage quando mudar
    useEffect(() => {
        if (!isInitialized) return

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
        } catch (error) {
            console.error('[Favorites] Erro ao salvar:', error)
        }
    }, [favorites, isInitialized])

    const addFavorite = useCallback((product: Omit<FavoriteProduct, 'addedAt'>) => {
        setFavorites(prev => {
            // Evitar duplicatas
            if (prev.some(fav => fav.id === product.id)) {
                return prev
            }

            const newFavorite: FavoriteProduct = {
                ...product,
                addedAt: Date.now(),
            }

            return [newFavorite, ...prev] // Mais recente primeiro
        })
    }, [])

    const removeFavorite = useCallback((productId: string) => {
        setFavorites(prev => {
            const filtered = prev.filter(fav => fav.id !== productId)
            return filtered
        })
    }, [])

    const isFavorite = useCallback((productId: string): boolean => {
        return favorites.some(fav => fav.id === productId)
    }, [favorites])

    const toggleFavorite = useCallback((product: Omit<FavoriteProduct, 'addedAt'>) => {
        if (isFavorite(product.id)) {
            removeFavorite(product.id)
        } else {
            addFavorite(product)
        }
    }, [isFavorite, removeFavorite, addFavorite])

    const clearFavorites = useCallback(() => {
        setFavorites([])
    }, [])

    return (
        <FavoritesContext.Provider
            value={{
                favorites,
                addFavorite,
                removeFavorite,
                isFavorite,
                toggleFavorite,
                totalFavorites: favorites.length,
                clearFavorites,
            }}
        >
            {children}
        </FavoritesContext.Provider>
    )
}

export function useFavorites() {
    const context = useContext(FavoritesContext)
    if (context === undefined) {
        throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
    }
    return context
}
