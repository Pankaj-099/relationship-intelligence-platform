import { clsx } from 'clsx'

interface BadgeProps {
  label: string
  color?: string
  size?: 'sm' | 'md'
}

export const Badge = ({ label, color = '#6366f1', size = 'sm' }: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      {label}
    </span>
  )
}
