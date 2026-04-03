import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, GitBranch } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const Login = () => {
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await login(form)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 flex-col justify-between p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GitBranch size={20} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">RIP</span>
        </div>

        <div>
          <div className="mb-8">
            {/* Mini graph illustration */}
            <div className="relative w-64 h-48">
              {/* Nodes */}
              {[
                { x: 32, y: 20, color: 'bg-indigo-500', size: 'w-10 h-10' },
                { x: 64, y: 50, color: 'bg-violet-500', size: 'w-8 h-8' },
                { x: 20, y: 60, color: 'bg-sky-500', size: 'w-7 h-7' },
                { x: 75, y: 20, color: 'bg-emerald-500', size: 'w-6 h-6' },
                { x: 50, y: 75, color: 'bg-amber-500', size: 'w-7 h-7' },
              ].map((node, i) => (
                <div
                  key={i}
                  className={`absolute ${node.size} ${node.color} rounded-full opacity-80 blur-sm`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                />
              ))}
              {/* Lines between nodes */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                <line x1="40%" y1="25%" x2="67%" y2="25%" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="40%" y1="25%" x2="27%" y2="63%" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="67%" y1="55%" x2="53%" y2="78%" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="27%" y1="63%" x2="53%" y2="78%" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="67%" y1="25%" x2="67%" y2="55%" stroke="#6366f1" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Visualize your<br />
            <span className="text-indigo-400">data relationships</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Build, explore, and gain insights from complex relationship graphs. 
            Powered by AI to extract connections automatically.
          </p>
        </div>

        <div className="flex items-center gap-6">
          {[
            { label: 'Nodes', value: '10K+' },
            { label: 'Relationships', value: '50K+' },
            { label: 'Insights', value: 'AI-powered' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-white font-bold text-lg">{stat.value}</div>
              <div className="text-slate-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GitBranch size={20} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg">RIP</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              leftIcon={<Mail size={16} />}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-slate-800 border-slate-600 accent-indigo-500" />
                <span className="text-sm text-slate-400">Remember me</span>
              </label>
              <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
