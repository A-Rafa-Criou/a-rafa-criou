'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface MobileSearchContextType {
    isOpen: boolean
    openSearch: () => void
    closeSearch: () => void
    toggleSearch: () => void
}

const MobileSearchContext = createContext<MobileSearchContextType | undefined>(undefined)

export function MobileSearchProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    const openSearch = () => setIsOpen(true)
    const closeSearch = () => setIsOpen(false)
    const toggleSearch = () => setIsOpen(prev => !prev)

    return (
        <MobileSearchContext.Provider value={{ isOpen, openSearch, closeSearch, toggleSearch }}>
            {children}
        </MobileSearchContext.Provider>
    )
}

export function useMobileSearch() {
    const context = useContext(MobileSearchContext)
    if (context === undefined) {
        throw new Error('useMobileSearch must be used within a MobileSearchProvider')
    }
    return context
}
