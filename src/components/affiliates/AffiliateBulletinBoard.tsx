'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface BulletinMessage {
    id: string;
    message: string;
    createdAt: string;
}

export default function AffiliateBulletinBoard() {
    const [messages, setMessages] = useState<BulletinMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        loadMessages();

        // Atualização automática a cada 30 segundos
        const interval = setInterval(() => {
            loadMessages();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadMessages = async () => {
        try {
            const response = await fetch('/api/affiliates/bulletin');
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Erro ao carregar mural:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Agora mesmo';
        if (diffMin < 60) return `Há ${diffMin} min`;
        if (diffHours < 24) return `Há ${diffHours}h`;
        if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    if (loading) return null;
    if (messages.length === 0) return null;

    return (
        <div className="mb-6 sm:mb-8">
            {/* CSS para animações customizadas */}
            <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(253, 149, 85, 0.4), 0 0 8px rgba(253, 149, 85, 0.2); }
          50% { box-shadow: 0 0 8px rgba(253, 149, 85, 0.6), 0 0 16px rgba(253, 149, 85, 0.3); }
        }
        @keyframes card-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .badge-glow {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #FD9555 0%, #FED466 40%, #FD9555 60%, #FED466 100%);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        .card-shine {
          position: relative;
          overflow: hidden;
        }
        .card-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(253, 149, 85, 0.15) 50%,
            transparent
          );
          animation: card-shine 3s ease-in-out infinite;
        }
        .float-icon {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>

            <div className="relative rounded-xl border-2 border-[#FED466]/80 bg-gradient-to-br from-[#FED466]/8 via-white to-[#FD9555]/5 shadow-lg hover:shadow-xl transition-shadow duration-300">
                {/* Faixa decorativa superior animada */}
                <div className="absolute top-0 left-0 w-full h-1.5 shimmer-bg rounded-t-xl" />

                {/* Header do mural */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between px-4 sm:px-6 pt-5 pb-3 hover:bg-[#FED466]/5 transition-colors rounded-t-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#FED466] to-[#FD9555] shadow-md">
                            <Megaphone className="h-5 w-5 text-white" />
                            {messages.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {messages.length}
                                </span>
                            )}
                        </div>
                        <div className="text-left">
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-1.5">
                                📢 Mural de Notícias
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-500">
                                Aqui é o mural de notícias, toda informação será informada abaixo
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className={`rounded-full p-1.5 transition-colors ${expanded ? 'bg-[#FD9555]/10' : 'bg-gray-100'}`}>
                            {expanded ? (
                                <ChevronUp className="h-4 w-4 text-[#FD9555]" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                        </div>
                    </div>
                </button>

                {/* Separador */}
                {expanded && (
                    <div className="mx-4 sm:mx-6 border-t border-[#FED466]/30" />
                )}

                {/* Conteúdo do mural */}
                {expanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-4">
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                            {messages.map((msg, index) => (
                                <div
                                    key={msg.id}
                                    className={`group relative rounded-xl border bg-white p-4 transition-all duration-200 ${index === 0
                                        ? 'card-shine border-2 border-[#FD9555]/40 border-l-[6px] border-l-[#FD9555] shadow-lg hover:shadow-xl bg-gradient-to-br from-[#FED466]/8 via-white to-[#FD9555]/5 ring-1 ring-[#FD9555]/20'
                                        : 'border-gray-100 border-l-4 border-l-[#FED466]/50 shadow-sm hover:shadow-md hover:border-[#FED466]/80'
                                        }`}
                                >


                                    <div className="flex items-start justify-between gap-3">
                                        <p className={`text-sm whitespace-pre-wrap leading-relaxed flex-1 ${index === 0 ? 'text-gray-800 font-semibold' : 'text-gray-600'
                                            }`}>
                                            {msg.message}
                                        </p>
                                        {index === 0 && (
                                            <span className="badge-glow shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FD9555] to-[#e8864d] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg ring-2 ring-white">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                NOVO
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2.5">
                                        <Clock className={`h-3 w-3 ${index === 0 ? 'text-[#FD9555]/60' : 'text-gray-300'}`} />
                                        <span className={`text-[11px] ${index === 0 ? 'text-[#FD9555]/80 font-medium' : 'text-gray-400'}`}>
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
