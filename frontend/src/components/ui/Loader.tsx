import { clsx } from 'clsx'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  fullScreen?: boolean
}

export const Loader = ({ size = 'md', text, fullScreen }: LoaderProps) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={clsx(
          'rounded-full border-slate-700 border-t-indigo-500 animate-spin',
          sizeMap[size]
        )}
      />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
