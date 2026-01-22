"use client";
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

export default function HeroSection() {
    const { t } = useTranslation('common')
    const videoRef = useRef<HTMLVideoElement | null>(null);




    // Normalize various break markers translators might use into a single newline
    const splitByBreaks = (text: string) => {
        if (!text) return [''];
        // Replace HTML-like <br> tags and custom [br] token with \n, then split
        const normalized = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\[br\]/gi, '\n');
        return normalized.split(/\r?\n/).map(s => s.trim());
    }

    return (
        <section className="relative w-full flex items-center justify-center bg-[#F4F4F4] overflow-hidden hero-critical">
            <div className="relative w-full max-w-none">
                {/* Usar video do Cloudinary (economia de ~130 KB vs GIF) */}
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    className="w-full h-auto block min-h-60 md:min-h-100 object-cover transform scale-100 sm:scale-100  xl:scale-110"
                    poster="/Banner_principal.gif"
                >
                    <Image
                        src="/Banner_principal.gif"
                        alt={t('a11y.heroAlt')}
                        width={1920}
                        height={600}
                        className="w-full h-auto block"
                        priority
                        fetchPriority="high"
                        unoptimized={true}
                        quality={75}
                    />
                </video>

                {/* Texto sobreposto ao GIF */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <h1 className="font-Scripter md:text-5xl lg:text-6xl xl:text-[4rem] 2xl:text-[5rem] font-bold mb-3 sm:mb-4 md:mb-5 lg:mb-5 xl:mb-6 uppercase text-center leading-none text-[#FD9555] text-5xl sm:text-6xl lg:text-[clamp(3rem,6vw,6rem)] hero-h1">
                        {(() => {
                            const title = t('hero.title', 'BEM-VINDA \n OVELHINHA!');
                            const parts = splitByBreaks(title);
                            return parts.map((line, idx) => (
                                <span key={idx}>
                                    {line}
                                    {idx < parts.length - 1 && <br />}
                                </span>
                            ));
                        })()}
                    </h1>

                    <p
                        className="text-[#FD9555] text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 2xl:text-xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl leading-relaxed text-center mx-auto"
                    >
                        {(() => {
                            const subtitle = t(
                                'hero.subtitle',
                                'Descubra uma coleção de arquivos \n teocráticos digitais para ajudar \n você a dar seu melhor a Jeová!'
                            );
                            const parts = splitByBreaks(subtitle);
                            return parts.map((line, idx) => (
                                <span key={idx}>
                                    {line}
                                    {idx < parts.length - 1 && <br />}
                                </span>
                            ));
                        })()}
                    </p>
                </div>
            </div>
        </section>
    );
}