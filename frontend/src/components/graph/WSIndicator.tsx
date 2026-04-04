import { Wifi, WifiOff, Users } from 'lucide-react'

interface WSIndicatorProps {
  isConnected: boolean
  connections: number
}

export const WSIndicator = ({ isConnected, connections }: WSIndicatorProps) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${
      isConnected
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-slate-800 border-slate-700 text-slate-500'
    }`}>
      {isConnected ? (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi size={12} />
          <span>Live</span>
          {connections > 1 && (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {connections}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff size={12} />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}
