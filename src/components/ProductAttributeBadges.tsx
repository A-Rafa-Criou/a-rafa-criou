'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslatedAttributes } from '@/hooks/use-i18n-product';

type ProductAttributeBadgesProps = {
    attributes?: Array<{ name: string; value: string }>;
    className?: string;
};

export function ProductAttributeBadges({
    attributes,
    className = '',
}: ProductAttributeBadgesProps) {
    const { attributes: translatedAttrs, loading } =
        useTranslatedAttributes(attributes);

    if (!attributes || attributes.length === 0) {
        return null;
    }

    if (loading) {
        return (
            <div className={`flex flex-wrap gap-1.5 ${className}`}>
                {attributes.map((_, idx) => (
                    <Badge
                        key={idx}
                        variant="outline"
                        className="bg-gradient-to-r from-[#FED466]/20 to-[#FED466]/10 text-gray-700 border-[#FED466]/50 text-xs px-2 py-0.5 animate-pulse"
                    >
                        <span className="opacity-0">Loading...</span>
                    </Badge>
                ))}
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {translatedAttrs.map((attr) => (
                <Badge
                    key={attr.id}
                    variant="outline"
                    className="bg-gradient-to-r from-[#FED466]/20 to-[#FED466]/10 text-gray-700 border-[#FED466]/50 text-xs px-2 py-0.5"
                >
                    <span className="opacity-70">{attr.name}:</span>
                    <span className="ml-1 font-semibold">{attr.value}</span>
                </Badge>
            ))}
        </div>
    );
}
