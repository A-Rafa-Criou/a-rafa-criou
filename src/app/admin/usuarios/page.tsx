import { Metadata } from 'next'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import UsersPageClient from '@/components/admin/UsersPageClient'

export const metadata: Metadata = {
    title: 'Gerenciar Usuários - A Rafa Criou Admin',
    description: 'Gerenciar usuários e permissões administrativas'
}

const SUPER_ADMINS = ['arafacriou@gmail.com', 'contato@arafacriou.com.br', 'edduardooo2011@gmail.com']

export default async function UsersPage() {
    const session = await getServerSession(authOptions)

    // Verificar se é super-admin
    if (!session?.user?.email || !SUPER_ADMINS.includes(session.user.email)) {
        redirect('/admin')
    }

    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <UsersPageClient />
        </Suspense>
    )
}