import apiClient from './client'

export interface Snapshot {
  id: number
  description: string
  node_count: number
  edge_count: number
  created_at: string
}

export interface DiffResult {
  snapshot_a: { id: number; description: string; created_at: string }
  snapshot_b: { id: number; description: string; created_at: string }
  diff: {
    nodes_added: any[]
    nodes_removed: any[]
    nodes_modified: any[]
    edges_added: any[]
    edges_removed: any[]
    summary: {
      nodes_added: number
      nodes_removed: number
      nodes_modified: number
      edges_added: number
      edges_removed: number
      total_changes: number
    }
  }
}

export const historyApi = {
  list: async (projectId: number): Promise<Snapshot[]> => {
    const res = await apiClient.get<Snapshot[]>(`/projects/${projectId}/history`)
    return res.data
  },

  save: async (projectId: number, description: string): Promise<Snapshot> => {
    const res = await apiClient.post<Snapshot>(`/projects/${projectId}/history`, { description })
    return res.data
  },

  getDiff: async (projectId: number, snapshotAId: number, snapshotBId: number): Promise<DiffResult> => {
    const res = await apiClient.get<DiffResult>(`/projects/${projectId}/history/diff`, {
      params: { snapshot_a_id: snapshotAId, snapshot_b_id: snapshotBId },
    })
    return res.data
  },

  delete: async (projectId: number, snapshotId: number): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/history/${snapshotId}`)
  },
}
