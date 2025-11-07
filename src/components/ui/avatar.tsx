'use client'

import { User } from 'lucide-react'
import { hasUserImage, getUserInitials } from '@/lib/utils/user'
import { cn } from '@/lib/utils'

interface AvatarProps {
    imageUrl?: string | null
    name?: string | null
    size?: 'sm' | 'md' | 'lg'
    className?: string
    fallbackClassName?: string
}

const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
}

const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
}

export function Avatar({
    imageUrl,
    name,
    size = 'md',
    className,
    fallbackClassName
}: AvatarProps) {
    const hasImage = hasUserImage(imageUrl)
    const initials = getUserInitials(name)

    const baseClasses = cn(
        'inline-flex items-center justify-center rounded-full bg-white/20 text-white font-medium',
        sizeClasses[size],
        className
    )

    if (hasImage) {
        return (
            <div className={baseClasses}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl!}
                    alt={name || 'Avatar do usuário'}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
        )
    }

    // Fallback: iniciais do usuário ou ícone
    return (
        <div className={cn(baseClasses, fallbackClassName)}>
            {initials !== 'U' ? (
                <span className="font-bold">{initials}</span>
            ) : (
                <User className={iconSizeClasses[size]} />
            )}
        </div>
    )
}