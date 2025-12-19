'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
    return (
        <Card className={cn('border-2 shadow-sm hover:shadow-md transition-shadow', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">{title}</CardTitle>
                {icon && <div className="opacity-80">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{value}</div>
                {subtitle && <p className="text-sm opacity-80 mt-2 font-medium">{subtitle}</p>}
                {trend && (
                    <div className="flex items-center mt-3 pt-3 border-t border-current/20">
                        <span
                            className={cn(
                                'text-sm font-semibold flex items-center gap-1',
                                trend.isPositive ? 'text-green-700' : 'text-red-700'
                            )}
                        >
                            <span className="text-lg">{trend.isPositive ? '↑' : '↓'}</span>
                            {Math.abs(trend.value)}%
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
