'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm flex-wrap">
                {/* Home sempre primeiro */}
                <li className="flex items-center gap-2">
                    <Link
                        href="/"
                        className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                    >
                        <Home className="w-4 h-4" />
                        <span className="sr-only md:not-sr-only">Início</span>
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </li>

                {/* Items customizados */}
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center gap-2">
                            {item.href && !isLast ? (
                                <>
                                    <Link
                                        href={item.href}
                                        className="text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </>
                            ) : (
                                <span
                                    className={isLast ? 'text-gray-900 font-medium' : 'text-gray-600'}
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
