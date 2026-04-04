export interface Project {
  id: number
  name: string
  description: string | null
  owner_id: number
  is_public: boolean
  share_token: string | null
  color: string
  icon: string
  node_count: number
  edge_count: number
  created_at: string
  updated_at: string
}

export interface GraphNode {
  id: number
  project_id: number
  external_id: string
  label: string
  node_type: string
  properties: Record<string, any>
  position_x: number
  position_y: number
  color: string | null
  size: number
  created_at: string
}

export interface GraphEdge {
  id: number
  project_id: number
  source_id: number
  target_id: number
  relationship_type: string
  label: string | null
  properties: Record<string, any>
  weight: number
  is_directed: boolean
  created_at: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  total_nodes: number
  total_edges: number
}

export interface SchemaDefinition {
  id: number
  project_id: number
  name: string
  schema_type: 'node' | 'edge'
  color: string
  icon: string | null
  properties_schema: Record<string, any>
  created_at: string
}