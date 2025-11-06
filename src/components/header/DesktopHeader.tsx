'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Search, Instagram, Loader2 } from 'lucide-react'
import { useCurrency } from '@/contexts/currency-context'

interface DesktopHeaderProps {
    totalItems: number
}

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

export function DesktopHeader({ totalItems }: DesktopHeaderProps) {
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
                    const response = await fetch(`/api/products?q=${encodeURIComponent(searchQuery)}&limite=8`)
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
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
        <div className="bg-[#FED466] ">
            <div className="container mx-auto px-2 sm:px-4">
                <div className="hidden md:flex items-center justify-between">
                    {/* Desktop: Logo */}
                    <Link href="/" className="flex items-center gap-2 no-underline">
                        <Image
                            src="/logo.webp"
                            alt={t('siteTitle')}
                            width={200}
                            height={60}
                            className="h-14 sm:h-16 md:h-18 w-auto"
                        />
                    </Link>

                    {/* Desktop: Barra de busca central com live results */}
                    <div className="flex-1 max-w-md sm:max-w-lg md:max-w-2xl mx-4 sm:mx-6 md:mx-8 relative" ref={searchRef}>
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
                                className="w-full h-10 md:h-12 pl-4 pr-12 rounded-lg border-0 bg-white text-black placeholder:text-gray-500"
                                autoComplete="off"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSearching}
                                className="absolute right-1 top-1 h-8 w-8 md:h-10 md:w-10 bg-[#FD9555] hover:bg-[#FD9555]/90 text-white rounded-lg"
                                aria-label={t('search.ariaLabel', 'Buscar produtos')}
                            >
                                {isSearching ? (
                                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                ) : (
                                    <Search className="w-3 h-3 md:w-4 md:h-4" />
                                )}
                            </Button>
                        </form>

                        {/* Dropdown de Resultados */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                                {searchResults.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleResultClick(product.slug)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 text-left"
                                    >
                                        <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
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
                                            {t('search.viewAllResults', 'Ver todos os resultados para')} &ldquo;{searchQuery}&rdquo;
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sem resultados */}
                        {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                                <p className="text-sm text-gray-600 text-center">
                                    {t('search.noResults', 'Nenhum produto encontrado para')} &ldquo;{searchQuery}&rdquo;
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Desktop: Carrinho + Instagram */}
                    <div className="flex items-center gap-2">
                        {/* Carrinho */}
                        <Button asChild variant="ghost" size="lg" className="relative bg-white/20 hover:bg-white/30 rounded-full p-6">
                            <Link href="/carrinho" className="no-underline">
                                <ShoppingCart className="w-5 h-5 text-black" />
                                {totalItems > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0 text-xs bg-[#FD9555] text-white border-2 border-white rounded-full"
                                    >
                                        {totalItems}
                                    </Badge>
                                )}
                            </Link>
                        </Button>

                        {/* Instagram */}
                        <Link
                            href="https://instagram.com/arafacriou"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/20 rounded-full p-3 hover:bg-white/30 transition-colors no-underline"
                        >
                            <Instagram className="w-5 h-5 text-black" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}