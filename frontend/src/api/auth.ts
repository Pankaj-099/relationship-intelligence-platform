import apiClient from './client'

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

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  username: string
  full_name?: string
  password: string
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/register', data)
    return res.data
  },

  login: async (data: LoginPayload): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/login', data)
    return res.data
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me')
    return res.data
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.patch<User>('/auth/me', data)
    return res.data
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return res.data
  },
}