import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
    id: number
    email: string
    username: string
    full_name: string | null
    is_active: boolean
    is_verified: boolean
    avatar_url: string | null
    created_at: string
}

interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
    setAuth: (user: User, accessToken: string, refreshToken: string) => void
    setUser: (user: User) => void
    logout: () => void
    setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,

            setAuth: (user, accessToken, refreshToken) => {
                localStorage.setItem('access_token', accessToken)
                localStorage.setItem('refresh_token', refreshToken)
                set({ user, accessToken, refreshToken, isAuthenticated: true })
            },

            setUser: (user) => set({ user }),

            logout: () => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                })
            },

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'rip-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)