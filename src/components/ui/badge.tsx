import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-border bg-muted text-foreground hover:bg-muted/80",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive font-bold",
        destructiveSolid:
          "border-transparent bg-destructive text-destructive-foreground font-bold shadow-xs",
        outline: "border-border text-foreground",
        accent: "border-foreground/20 bg-accent text-accent-foreground font-bold shadow-xs",
        amber: "amber-glass font-medium",
        otc: "border-primary/20 bg-primary/10 text-primary font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
