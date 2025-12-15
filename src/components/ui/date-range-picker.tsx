"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { toZonedTime } from "date-fns-tz"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

// Timezone de Brasília
const BRAZIL_TZ = 'America/Sao_Paulo';

// Helper para obter a data atual no timezone de Brasília
const getNowInBrazil = () => toZonedTime(new Date(), BRAZIL_TZ);

interface DateRangePickerProps {
    value?: DateRange | undefined
    onChange?: (range: DateRange | undefined) => void
    dateRange?: DateRange | undefined
    onDateRangeChange?: (range: DateRange | undefined) => void
    className?: string
}

export function DateRangePicker({
    value,
    onChange,
    dateRange,
    onDateRangeChange,
    className,
}: DateRangePickerProps) {
    // Suportar ambas as interfaces
    const currentValue = value ?? dateRange
    const handleChange = onChange ?? onDateRangeChange ?? (() => { })

    const [isOpen, setIsOpen] = React.useState(false)
    const [tempRange, setTempRange] = React.useState<DateRange | undefined>(currentValue)

    // Sincronizar tempRange quando currentValue mudar externamente
    React.useEffect(() => {
        setTempRange(currentValue)
    }, [currentValue])

    // Presets de datas - criar apenas a data (sem horas) pois a API trata as horas
    const presets = [
        {
            label: "Hoje", getValue: () => {
                const nowBr = getNowInBrazil();
                const today = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate());
                return { from: today, to: today }; // Mesmo dia para from e to
            }
        },
        {
            label: "Ontem", getValue: () => {
                const nowBr = getNowInBrazil();
                const yesterday = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate() - 1);
                return { from: yesterday, to: yesterday }; // Mesmo dia para from e to
            }
        },
        {
            label: "7 dias", getValue: () => {
                const nowBr = getNowInBrazil();
                const start = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate() - 6);
                const end = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate());
                return { from: start, to: end };
            }
        },
        {
            label: "30 dias", getValue: () => {
                const nowBr = getNowInBrazil();
                const start = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate() - 29);
                const end = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate());
                return { from: start, to: end };
            }
        },
        {
            label: "Semana", getValue: () => {
                const nowBr = getNowInBrazil();
                const start = startOfWeek(nowBr, { weekStartsOn: 0 });
                const end = endOfWeek(nowBr, { weekStartsOn: 0 });
                return { from: start, to: end };
            }
        },
        {
            label: "Mês", getValue: () => {
                const nowBr = getNowInBrazil();
                const start = startOfMonth(nowBr);
                const end = endOfMonth(nowBr);
                return { from: start, to: end };
            }
        },
        {
            label: "Mês anterior", getValue: () => {
                const nowBr = getNowInBrazil();
                const lastMonth = subDays(startOfMonth(nowBr), 1);
                const start = startOfMonth(lastMonth);
                const end = endOfMonth(lastMonth);
                return { from: start, to: end };
            }
        },
        {
            label: "Ano", getValue: () => {
                const nowBr = getNowInBrazil();
                const start = startOfYear(nowBr);
                const end = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate());
                return { from: start, to: end };
            }
        },
    ]

    const handlePresetSelect = (preset: typeof presets[0]) => {
        const range = preset.getValue()
        setTempRange(range)
    }

    const handleApply = () => {
        // Normalizar datas antes de aplicar (remover horas para evitar problemas)
        if (tempRange?.from) {
            const normalizedFrom = new Date(
                tempRange.from.getFullYear(),
                tempRange.from.getMonth(),
                tempRange.from.getDate()
            );
            
            // Se 'to' não for definido, usar o mesmo dia de 'from'
            // para garantir que busque o dia completo (00:00 - 23:59:59)
            const normalizedTo = tempRange.to ? new Date(
                tempRange.to.getFullYear(),
                tempRange.to.getMonth(),
                tempRange.to.getDate()
            ) : normalizedFrom;
            
            const normalizedRange: DateRange = {
                from: normalizedFrom,
                to: normalizedTo
            };
            
            handleChange(normalizedRange)
        } else {
            handleChange(tempRange)
        }
        setIsOpen(false)
    }

    const handleClear = () => {
        setTempRange(undefined)
        handleChange(undefined)
        setIsOpen(false)
    }

    const handleCalendarSelect = (range: DateRange | undefined) => {
        // Normalizar datas selecionadas do calendário
        if (range?.from) {
            const normalizedFrom = new Date(
                range.from.getFullYear(),
                range.from.getMonth(),
                range.from.getDate()
            );
            
            // Se 'to' não for definido, usar o mesmo dia de 'from'
            // para garantir que busque o dia completo (00:00 - 23:59:59)
            const normalizedTo = range.to ? new Date(
                range.to.getFullYear(),
                range.to.getMonth(),
                range.to.getDate()
            ) : normalizedFrom;
            
            const normalizedRange: DateRange = {
                from: normalizedFrom,
                to: normalizedTo
            };
            
            setTempRange(normalizedRange)
        } else {
            setTempRange(range)
        }
    }

    return (
        <>
            {/* Trigger Button */}
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "justify-start text-left font-normal h-9 px-3 border-gray-300",
                    !currentValue && "text-muted-foreground",
                    className
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                    {currentValue?.from ? (
                        currentValue.to && currentValue.to.getTime() !== currentValue.from.getTime() ? (
                            <>
                                {format(currentValue.from, "dd/MM/yyyy", { locale: ptBR })}
                                {" - "}
                                {format(currentValue.to, "dd/MM/yyyy", { locale: ptBR })}
                            </>
                        ) : (
                            // Dia único
                            format(currentValue.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                    ) : (
                        "Selecionar período"
                    )}
                </span>
            </Button>

            {/* Modal Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-md p-0 gap-0">
                    <DialogHeader className="p-4 pb-2 border-b">
                        <DialogTitle className="text-base font-medium flex items-center justify-between">
                            Selecionar Período
                            {tempRange?.from && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    {format(tempRange.from, "dd/MM/yyyy", { locale: ptBR })}
                                    {tempRange.to && tempRange.to.getTime() !== tempRange.from.getTime() && 
                                        ` - ${format(tempRange.to, "dd/MM/yyyy", { locale: ptBR })}`}
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Presets - Grid compacto */}
                    <div className="p-3 border-b bg-gray-50/50">
                        <div className="grid grid-cols-4 gap-1.5">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2 hover:bg-[#FED466]/20 hover:text-gray-900"
                                    onClick={() => handlePresetSelect(preset)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar - Com estilo de range amarelo */}
                    <div
                        className="p-3 flex justify-center"
                        style={{
                            // @ts-expect-error - CSS custom properties for calendar styling
                            '--range-bg': '#FED466',
                            '--range-middle-bg': 'rgba(254, 212, 102, 0.25)',
                        }}
                    >
                        <Calendar
                            mode="range"
                            defaultMonth={tempRange?.from || new Date()}
                            selected={tempRange}
                            onSelect={handleCalendarSelect}
                            numberOfMonths={1}
                            locale={ptBR}
                            modifiersStyles={{
                                range_start: { backgroundColor: '#FED466', color: '#1f2937' },
                                range_end: { backgroundColor: '#FED466', color: '#1f2937' },
                                range_middle: { backgroundColor: 'rgba(254, 212, 102, 0.3)', color: '#1f2937' },
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between p-3 border-t bg-gray-50/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="text-gray-500 h-8"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Limpar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleApply}
                            className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900 h-8 px-6"
                        >
                            Aplicar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
