'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface AnalyticsProps {
    googleAnalyticsId?: string
    facebookPixelId?: string
}

declare global {
    interface Window {
        dataLayer?: unknown[]
        gtag?: (...args: unknown[]) => void
        fbq?: (...args: unknown[]) => void
    }
}

export function Analytics({ googleAnalyticsId, facebookPixelId }: AnalyticsProps) {
    useEffect(() => {
        // Facebook Pixel PageView event
        if (facebookPixelId && typeof window !== 'undefined' && window.fbq) {
            window.fbq('track', 'PageView')
        }
    }, [facebookPixelId])

    return (
        <>
            {/* Google Analytics */}
            {googleAnalyticsId && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                        strategy="lazyOnload"
                    />
                    <Script id="google-analytics" strategy="lazyOnload">
                        {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}', {
                page_path: window.location.pathname,
              });
            `}
                    </Script>
                </>
            )}

            {/* Facebook Pixel */}
            {facebookPixelId && (
                <>
                    <Script id="facebook-pixel" strategy="lazyOnload">
                        {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
            `}
                    </Script>
                </>
            )}
        </>
    )
}
