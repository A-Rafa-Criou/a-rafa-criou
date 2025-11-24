import Image from 'next/image'

type PaymentMethod = 'visa' | 'mastercard' | 'mercadopago' | 'pix' | 'paypal' | 'stripe'

interface PaymentIconProps {
    method: PaymentMethod
    className?: string
    width?: number
    height?: number
}

const paymentLabels: Record<PaymentMethod, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    mercadopago: 'Mercado Pago',
    pix: 'PIX - Pagamento Instantâneo',
    paypal: 'PayPal',
    stripe: 'Stripe'
}

export function PaymentIcon({
    method,
    className = 'h-5 w-auto',
    width = 48,
    height = 32
}: PaymentIconProps) {
    return (
        <Image
            src={`/payments/${method}.svg`}
            alt={paymentLabels[method]}
            width={width}
            height={height}
            className={className}
            style={{ width: 'auto', height: 'auto' }}
            loading="lazy"
        />
    )
}


export function PaymentMethods({
    className = 'flex flex-wrap gap-2',
    iconSize = 'default'
}: {
    className?: string
    iconSize?: 'small' | 'default' | 'large'
}) {
    const methods: PaymentMethod[] = ['visa', 'mastercard', 'stripe', 'paypal', 'pix', 'mercadopago']

    const sizes = {
        small: { width: 48, height: 32, class: 'h-5 sm:h-6 w-[92%]' },
        default: { width: 60, height: 40, class: 'h-7 sm:h-8 w-[94%]' },
        large: { width: 72, height: 48, class: 'sm:h-16 w-[96%]' }
    }

    const size = sizes[iconSize]

    return (
        <div className={className}>
            {methods.map(method => (
                <div
                    key={method}
                    className="bg-white/20 backdrop-blur-sm shadow-lg rounded px-1.5 flex justify-center items-center"
                >
                    <PaymentIcon
                        method={method}
                        width={method === 'pix' ? 72 : size.width}
                        height={method === 'pix' ? 48 : size.height}
                        className={`${size.class} w-auto`}
                    />
                </div>
            ))}
        </div>
    )
}
