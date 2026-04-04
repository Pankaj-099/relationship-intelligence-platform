import apiClient from './client'
import type { GraphNode, GraphEdge, GraphData, SchemaDefinition } from '../types/graph'

export interface BulkImportResponse {
  nodes_created: number
  edges_created: number
  nodes_skipped: number
  edges_skipped: number
  errors: string[]
}

export interface CreateNodePayload {
  external_id: string
  label: string
  node_type?: string
  properties?: Record<string, any>
  position_x?: number
  position_y?: number
  color?: string
  size?: number
}

export interface CreateEdgePayload {
  source_external_id: string
  target_external_id: string
  relationship_type?: string
  label?: string
  properties?: Record<string, any>
  weight?: number
  is_directed?: boolean
}

export interface CreateSchemaPayload {
  name: string
  schema_type: 'node' | 'edge'
  color?: string
  icon?: string
  properties_schema?: Record<string, any>
}

export const graphApi = {
  getGraph: async (projectId: number, params?: { node_type?: string; search?: string; limit?: number }): Promise<GraphData> => {
    const res = await apiClient.get<GraphData>(`/projects/${projectId}/graph`, { params })
    return res.data
  },
  createNode: async (projectId: number, data: CreateNodePayload): Promise<GraphNode> => {
    const res = await apiClient.post<GraphNode>(`/projects/${projectId}/graph/nodes`, data)
    return res.data
  },
  updateNode: async (projectId: number, nodeId: number, data: Partial<CreateNodePayload>): Promise<GraphNode> => {
    const res = await apiClient.patch<GraphNode>(`/projects/${projectId}/graph/nodes/${nodeId}`, data)
    return res.data
  },
  deleteNode: async (projectId: number, nodeId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/graph/nodes/${nodeId}`)
  },
  createEdge: async (projectId: number, data: CreateEdgePayload): Promise<GraphEdge> => {
    const res = await apiClient.post<GraphEdge>(`/projects/${projectId}/graph/edges`, data)
    return res.data
  },
  deleteEdge: async (projectId: number, edgeId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/graph/edges/${edgeId}`)
  },
  importJson: async (projectId: number, file: File, replace = false): Promise<BulkImportResponse> => {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<BulkImportResponse>(
      `/projects/${projectId}/graph/import/json?replace=${replace}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },
  importCsv: async (projectId: number, file: File, replace = false): Promise<BulkImportResponse> => {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<BulkImportResponse>(
      `/projects/${projectId}/graph/import/csv?replace=${replace}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },
  clearGraph: async (projectId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/graph/clear`)
  },
  getSchema: async (projectId: number): Promise<SchemaDefinition[]> => {
    const res = await apiClient.get<SchemaDefinition[]>(`/projects/${projectId}/graph/schema`)
    return res.data
  },
  createSchema: async (projectId: number, data: CreateSchemaPayload): Promise<SchemaDefinition> => {
    const res = await apiClient.post<SchemaDefinition>(`/projects/${projectId}/graph/schema`, data)
    return res.data
  },
  deleteSchema: async (projectId: number, schemaId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/graph/schema/${schemaId}`)
  },
}