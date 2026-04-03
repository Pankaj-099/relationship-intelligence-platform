import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth'
import toast from 'react-hot-toast'

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth, logout, user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const login = async (data: LoginPayload) => {
    setIsLoading(true)
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.access_token, res.refresh_token)
      toast.success(`Welcome back, ${res.user.username}!`)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterPayload) => {
    setIsLoading(true)
    try {
      const res = await authApi.register(data)
      setAuth(res.user, res.access_token, res.refresh_token)
      toast.success(`Welcome to RIP, ${res.user.username}!`)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Registration failed'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return { login, register, logout: handleLogout, user, isAuthenticated, isLoading }
}