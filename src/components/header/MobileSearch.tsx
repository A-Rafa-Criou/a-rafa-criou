'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { useCurrency } from '@/contexts/currency-context'

interface SearchResult {
    id: string
    name: string
    slug: string
    price: number
    mainImage?: {
        data: string
        alt: string
    }
    images?: Array<{
        data: string
        alt: string
    }>
}

interface MobileSearchProps {
    isOpen: boolean
    onClose: () => void
}

export function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [showResults, setShowResults] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { t } = useTranslation('common')
    const { formatPrice } = useCurrency()

    // Live search com debounce
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true)
                try {
                    const response = await fetch(`/api/products?q=${encodeURIComponent(searchQuery)}&limite=6`)
                    if (response.ok) {
                        const data = await response.json()
                        setSearchResults(data.products || [])
                        setShowResults(true)
                    }
                } catch (error) {
                    console.error('Erro ao buscar produtos:', error)
                    setSearchResults([])
                } finally {
                    setIsSearching(false)
                }
            } else {
                setSearchResults([])
                setShowResults(false)
            }
        }, 300) // 300ms de debounce

        return () => clearTimeout(delayDebounce)
    }, [searchQuery])

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
                if (isOpen) {
                    onClose()
                }
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/produtos?q=${encodeURIComponent(searchQuery)}`)
            setShowResults(false)
        }
    }

    const handleResultClick = (slug: string) => {
        setShowResults(false)
        setSearchQuery('')
        onClose()
        router.push(`/produtos/${slug}`)
    }

    const getPreviewSrc = (product: SearchResult) => {
        if (product.mainImage?.data) {
            return product.mainImage.data
        }
        if (product.images && product.images.length > 0 && product.images[0].data) {
            return product.images[0].data
        }
        return '/placeholder-product.jpg'
    }

    return (
        <>
            {isOpen && (
                <div className="md:hidden bg-[#FED466] border-t border-[#FD9555]/20 transition-all duration-300 ease-in-out">
                    <div className="container mx-auto px-2 sm:px-4 py-2">
                        <div className="relative" ref={searchRef}>
                            <form onSubmit={handleSearch} className="relative">
                                <Input
                                    type="search"
                                    placeholder={t('search.placeholder', 'O que você procura?')}
                                    aria-label={t('search.ariaLabel', 'Buscar produtos')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => {
                                        if (searchResults.length > 0) setShowResults(true)
                                    }}
                                    className="w-full h-10 pl-4 pr-12 rounded-lg border-0 bg-white text-black placeholder:text-gray-500"
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSearching}
                                    className="absolute right-1 top-1 h-8 w-8 bg-[#FD9555] hover:bg-[#FD9555]/90 text-white rounded-lg"
                                    aria-label={t('search.ariaLabel', 'Buscar produtos')}
                                >
                                    {isSearching ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </form>

                            {/* Dropdown de Resultados */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                                    {searchResults.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleResultClick(product.slug)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 text-left"
                                        >
                                            <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                                <Image
                                                    src={getPreviewSrc(product)}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {product.name}
                                                </h4>
                                                <p className="text-sm font-bold text-[#FD9555] mt-1">
                                                    {formatPrice(product.price)}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                    {searchQuery.trim() && (
                                        <div className="p-3 bg-gray-50 border-t">
                                            <button
                                                onClick={() => {
                                                    router.push(`/produtos?q=${encodeURIComponent(searchQuery)}`)
                                                    setShowResults(false)
                                                }}
                                                className="text-sm text-[#FD9555] hover:text-[#FD9555]/80 font-medium"
                                            >
                                                Ver todos os resultados para &ldquo;{searchQuery}&rdquo;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sem resultados */}
                            {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                                    <p className="text-sm text-gray-600 text-center">
                                        Nenhum produto encontrado para &ldquo;{searchQuery}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
