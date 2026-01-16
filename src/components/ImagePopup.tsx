'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

export function ImagePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Pequeno delay para melhorar UX
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay escuro - não fecha ao clicar */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        aria-hidden="true"
      />

      {/* Modal centralizado */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative max-w-2xl w-full pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title"
        >
          {/* Botão fechar */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors z-10 cursor-pointer"
            aria-label="Fechar popup"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Imagem - 4:3 vertical no mobile, 4:3 horizontal no desktop */}
          <div className="relative w-full aspect-3/4 md:aspect-4/3 bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Imagem mobile (vertical 3:4) */}
            <Image
              src="/logo-mascote-mobile.webp"
              alt="Promoção especial"
              fill
              className="object-contain md:hidden"
              priority
            />
            {/* Imagem desktop (horizontal 4:3) */}
            <Image
              src="/logo-mascote-desktop.webp"
              alt="Promoção especial"
              fill
              className="object-contain hidden md:block"
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
}
