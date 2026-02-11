'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Users, DollarSign, FileKey, Settings, Handshake } from 'lucide-react'

const tabs = [
    {
        label: 'Afiliados',
        href: '/admin/afiliados',
        icon: Users,
    },
    {
        label: 'Comissões',
        href: '/admin/afiliados/comissoes',
        icon: DollarSign,
    },
    {
        label: 'Acesso a Arquivos',
        href: '/admin/afiliados/acesso-arquivos',
        icon: FileKey,
    },
    {
        label: 'Configurações',
        href: '/admin/afiliados/configuracoes',
        icon: Settings,
    },
]

export default function AfiliadosLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div>
            {/* Header */}
            <div className="mb-6 bg-linear-to-r from-[#FED466] to-[#FD9555] rounded-lg p-6 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Handshake className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
                        <p className="text-white/90">Gerencie afiliados, comissões e acessos</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = pathname === tab.href

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`
                                    group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap no-underline transition-colors
                                    ${isActive
                                        ? 'border-[#FD9555] text-[#FD9555]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FD9555]' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Content */}
            {children}
        </div>
    )
}
