"use client"
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-[11px] font-bold uppercase tracking-[0.05em] text-text-secondary leading-[14px]", className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
