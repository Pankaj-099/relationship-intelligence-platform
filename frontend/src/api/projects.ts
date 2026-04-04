import apiClient from './client'
import type { Project } from '../types/graph'

export interface CreateProjectPayload {
  name: string
  description?: string
  is_public?: boolean
  color?: string
  icon?: string
}

export interface ProjectListResponse {
  projects: Project[]
  total: number
}

export const projectsApi = {
  create: async (data: CreateProjectPayload): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', data)
    return res.data
  },
  list: async (): Promise<ProjectListResponse> => {
    const res = await apiClient.get<ProjectListResponse>('/projects')
    return res.data
  },
  get: async (id: number): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`)
    return res.data
  },
  update: async (id: number, data: Partial<CreateProjectPayload>): Promise<Project> => {
    const res = await apiClient.patch<Project>(`/projects/${id}`, data)
    return res.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },
  toggleShare: async (id: number): Promise<Project> => {
    const res = await apiClient.post<Project>(`/projects/${id}/share`)
    return res.data
  },
}