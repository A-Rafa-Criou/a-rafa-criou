"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-[3px] border-gray-700 bg-white data-[state=checked]:bg-[#FD9555] data-[state=checked]:text-white data-[state=checked]:border-[#FD9555] focus-visible:border-[#FD9555] focus-visible:ring-4 focus-visible:ring-[#FD9555]/30 aria-invalid:ring-destructive/20 aria-invalid:border-destructive size-7 shrink-0 rounded-md shadow-lg transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:border-[#FD9555] hover:shadow-xl hover:scale-110 hover:bg-[#FED466]/10",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-5 stroke-[4.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
