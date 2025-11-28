'use client'

import { MercadoPagoForm } from '@/components/checkout/MercadoPagoForm'

interface MercadoPagoCardCheckoutProps {
    appliedCoupon: {
        code: string
        discount: number
        type: string
        value: string
    } | null
    finalTotal: number
}

export function MercadoPagoCardCheckout({
    appliedCoupon,
    finalTotal,
}: MercadoPagoCardCheckoutProps) {
    return <MercadoPagoForm appliedCoupon={appliedCoupon} finalTotal={finalTotal} />
}
