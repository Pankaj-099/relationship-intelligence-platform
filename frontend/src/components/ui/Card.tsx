import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = ({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) => {
  return (
    <div
      className={clsx(
        'rounded-xl transition-all duration-200',
        {
          'bg-slate-900 border border-slate-800': variant === 'default',
          'bg-white/5 backdrop-blur-md border border-white/10': variant === 'glass',
          'bg-transparent border border-slate-700': variant === 'bordered',
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-5': padding === 'md',
          'p-7': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
