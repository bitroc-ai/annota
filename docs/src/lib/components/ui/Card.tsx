import * as React from "react"
import { cn } from "../../utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }