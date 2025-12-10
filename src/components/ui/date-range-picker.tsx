"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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

    // Presets de datas - normalizar para 00:00:00 e 23:59:59.999
    const presets = [
        {
            label: "Hoje", getValue: () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayEnd = new Date(today);
                todayEnd.setHours(23, 59, 59, 999);
                return { from: today, to: todayEnd };
            }
        },
        {
            label: "Ontem", getValue: () => {
                const yesterday = subDays(new Date(), 1);
                yesterday.setHours(0, 0, 0, 0);
                const yesterdayEnd = new Date(yesterday);
                yesterdayEnd.setHours(23, 59, 59, 999);
                return { from: yesterday, to: yesterdayEnd };
            }
        },
        {
            label: "7 dias", getValue: () => {
                const start = subDays(new Date(), 6);
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
        {
            label: "30 dias", getValue: () => {
                const start = subDays(new Date(), 29);
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
        {
            label: "Semana", getValue: () => {
                const start = startOfWeek(new Date(), { weekStartsOn: 0 });
                start.setHours(0, 0, 0, 0);
                const end = endOfWeek(new Date(), { weekStartsOn: 0 });
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
        {
            label: "Mês", getValue: () => {
                const start = startOfMonth(new Date());
                start.setHours(0, 0, 0, 0);
                const end = endOfMonth(new Date());
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
        {
            label: "Mês anterior", getValue: () => {
                const lastMonth = subDays(startOfMonth(new Date()), 1);
                const start = startOfMonth(lastMonth);
                start.setHours(0, 0, 0, 0);
                const end = endOfMonth(lastMonth);
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
        {
            label: "Ano", getValue: () => {
                const start = startOfYear(new Date());
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
        },
    ]

    const handlePresetSelect = (preset: typeof presets[0]) => {
        const range = preset.getValue()
        setTempRange(range)
    }

    const handleApply = () => {
        handleChange(tempRange)
        setIsOpen(false)
    }

    const handleClear = () => {
        setTempRange(undefined)
        handleChange(undefined)
        setIsOpen(false)
    }

    return (
        <>
            {/* Trigger Button */}
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "justify-start text-left font-normal h-9 px-3",
                    !currentValue && "text-muted-foreground",
                    className
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                    {currentValue?.from ? (
                        currentValue.to ? (
                            <>
                                {format(currentValue.from, "dd/MM/yy", { locale: ptBR })}
                                {" - "}
                                {format(currentValue.to, "dd/MM/yy", { locale: ptBR })}
                            </>
                        ) : (
                            format(currentValue.from, "dd/MM/yy", { locale: ptBR })
                        )
                    ) : (
                        "Período"
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
                                    {format(tempRange.from, "dd/MM", { locale: ptBR })}
                                    {tempRange.to && ` - ${format(tempRange.to, "dd/MM", { locale: ptBR })}`}
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
                                    className="h-7 text-xs px-2 hover:bg-[#FED466]/20"
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
                            onSelect={setTempRange}
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
