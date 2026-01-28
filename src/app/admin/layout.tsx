'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Package,
    Users,
    ShoppingCart,
    Settings,
    PlusCircle,
    BarChart3,
    LogOut,
    Menu,
    ChevronDown,
    User,
    FolderTree,
    Tag,
    Wallet,
    TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import { usePrefetchAdminData } from '@/hooks/useAdminData'

interface AdminLayoutProps {
    children: React.ReactNode
}

const SUPER_ADMINS = ['arafacriou@gmail.com', 'contato@arafacriou.com.br', 'edduardooo2011@gmail.com']

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { prefetchProducts, prefetchOrders, prefetchUsers, prefetchStats } = usePrefetchAdminData()
    const isSuperAdmin = session?.user?.email && SUPER_ADMINS.includes(session.user.email)

    useEffect(() => {
        if (status === 'loading') return

        if (!session) {
            router.push('/auth/login')
            return
        }

        if (session.user?.role !== 'admin') {
            router.push('/')
            return
        }
    }, [session, status, router])

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' })
    }

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen)
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FED466]"></div>
            </div>
        )
    }

    if (!session || session.user?.role !== 'admin') {
        return null
    }

    const menuItems = [
        {
            title: 'Dashboard',
            href: '/admin',
            icon: BarChart3,
            onHover: prefetchStats,
        },
        {
            title: 'Mais vendidos',
            href: '/admin/vendas',
            icon: TrendingUp,
        },
        {
            title: 'Produtos',
            href: '/admin/produtos',
            icon: Package,
            onHover: prefetchProducts,
        },
        {
            title: 'Categorias',
            href: '/admin/categorias',
            icon: FolderTree,
        },
        {
            title: 'Promoções',
            href: '/admin/promocoes',
            icon: Tag,
        },
        {
            title: 'Pedidos',
            href: '/admin/pedidos',
            icon: ShoppingCart,
            onHover: prefetchOrders,
        },
        {
            title: 'Usuários',
            href: '/admin/usuarios',
            icon: Users,
            onHover: prefetchUsers,
        },
        {
            title: 'Cupons',
            href: '/admin/cupons',
            icon: PlusCircle,
        },
        {
            title: 'Financeiro',
            href: '/admin/financeiro',
            icon: Wallet,
        },
        {
            title: 'Configurações',
            href: '/admin/configuracoes',
            icon: Settings,
        }
    ]

    return (
        <div className="h-screen bg-gray-50 overflow-hidden">
            {/* Mobile menu overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex h-full">
                {/* Sidebar - Fixo com altura total */}
                <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
                    {/* Logo */}
                    <div className=" border-b shrink-0">
                        <Link href="/admin" className="flex items-center gap-3 no-underline">
                            <Image
                                src="/mascote_raquel2.webp"
                                alt="A Rafa Criou"
                                width={60}
                                height={60}
                                className="w-20 h-16 object-contain"
                                priority
                            />
                            <div>
                                <h1 className="font-bold text-lg text-gray-900">A Rafa Criou</h1>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation - Scrollável */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {menuItems
                            .filter(item => {
                                // Ocultar "Usuários" para não super-admins
                                if (item.href === '/admin/usuarios' && !isSuperAdmin) {
                                    return false
                                }
                                return true
                            })
                            .map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={true}
                                        className={`
                                            group relative flex items-center gap-3 px-4 py-3 rounded-lg 
                                            transition-all duration-200 no-underline overflow-hidden
                                            ${isActive
                                                ? 'bg-linear-to-r from-[#FED466] to-[#FD9555] text-gray-900 shadow-md'
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-95'
                                            }
                                        `}
                                        onClick={() => setIsSidebarOpen(false)}
                                        onMouseEnter={() => item.onHover?.()}
                                    >
                                        {/* Efeito de brilho no hover */}
                                        {!isActive && (
                                            <span className="absolute inset-0 bg-linear-to-r from-transparent via-[#FED466]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                                        )}

                                        <Icon className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        <span className={`font-medium relative z-10 ${isActive ? 'font-bold' : ''}`}>
                                            {item.title}
                                        </span>
                                    </Link>
                                )
                            })}
                    </nav>

                    {/* User info and logout - Fixo no bottom */}
                    <div className="p-4 border-t bg-linear-to-r from-gray-50 to-white shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full flex items-center gap-3 h-auto p-3 hover:bg-gray-100 justify-start"
                                >
                                    <div className="w-8 h-8 bg-[#FED466] rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold text-gray-800">
                                            {session.user?.name?.charAt(0).toUpperCase() || 'A'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {session.user?.name || 'Administrador'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                                    <User className="w-4 h-4" />
                                    <a href="/conta/configuracoes" target="_blank" rel="noopener noreferrer">Meu Perfil</a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Main Content - Área scrollável */}
                <div className="flex-1 flex flex-col lg:ml-0 min-w-0 overflow-hidden">
                    {/* Header - Fixo */}
                    <header className="bg-white shadow-sm border-b px-6 py-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="lg:hidden p-2"
                                    onClick={toggleSidebar}
                                >
                                    <Menu className="w-5 h-5" />
                                </Button>
                                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                                    Painel Administrativo
                                </h2>
                            </div>
                            <Link
                                href="/"
                                className="text-[#FD9555] hover:text-[#FD9555]/80 no-underline text-sm lg:text-base font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver site →
                            </Link>
                        </div>
                    </header>

                    {/* Main content - Scrollável */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}