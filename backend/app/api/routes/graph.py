from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.project import Project
from app.models.graph import Node, Edge, SchemaDefinition, ActivityLog
from app.schemas.graph import (
    NodeCreate, NodeUpdate, NodeResponse,
    EdgeCreate, EdgeResponse,
    GraphDataResponse, BulkImportData, BulkImportResponse,
    SchemaDefinitionCreate, SchemaDefinitionResponse,
)
from app.services.graph.engine import GraphEngine

router = APIRouter(prefix="/projects/{project_id}/graph", tags=["Graph"])


# ─── Helpers ────────────────────────────────────────────────────────────────

async def get_project_or_403(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ─── Graph Data ─────────────────────────────────────────────────────────────

@router.get("", response_model=GraphDataResponse)
async def get_graph(
    project_id: int,
    node_type: str = Query(None),
    search: str = Query(None),
    limit: int = Query(500, le=2000),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)

    node_query = select(Node).where(Node.project_id == project_id)
    if node_type:
        node_query = node_query.where(Node.node_type == node_type)
    if search:
        node_query = node_query.where(Node.label.ilike(f"%{search}%"))
    node_query = node_query.limit(limit)

    nodes_result = await db.execute(node_query)
    nodes = nodes_result.scalars().all()

    node_ids = [n.id for n in nodes]
    edges_result = await db.execute(
        select(Edge).where(
            Edge.project_id == project_id,
            Edge.source_id.in_(node_ids),
            Edge.target_id.in_(node_ids),
        )
    )
    edges = edges_result.scalars().all()

    return GraphDataResponse(
        nodes=nodes,
        edges=edges,
        total_nodes=len(nodes),
        total_edges=len(edges),
    )


# ─── Nodes ──────────────────────────────────────────────────────────────────

@router.post("/nodes", response_model=NodeResponse, status_code=201)
async def create_node(
    project_id: int,
    data: NodeCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)

    existing = await db.execute(
        select(Node).where(Node.project_id == project_id, Node.external_id == data.external_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Node with id '{data.external_id}' already exists")

    node = Node(
        project_id=project_id,
        external_id=data.external_id,
        label=data.label,
        node_type=data.node_type,
        properties=data.properties,
        position_x=data.position_x,
        position_y=data.position_y,
        color=data.color,
        size=data.size,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    # Update project count
    project = await db.get(Project, project_id)
    if project:
        project.node_count += 1
        await db.commit()

    return node


@router.patch("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    project_id: int,
    node_id: int,
    data: NodeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    node = await db.get(Node, node_id)
    if not node or node.project_id != project_id:
        raise HTTPException(status_code=404, detail="Node not found")

    if data.label is not None:
        node.label = data.label
    if data.node_type is not None:
        node.node_type = data.node_type
    if data.properties is not None:
        node.properties = data.properties
    if data.position_x is not None:
        node.position_x = data.position_x
    if data.position_y is not None:
        node.position_y = data.position_y
    if data.color is not None:
        node.color = data.color
    if data.size is not None:
        node.size = data.size

    await db.commit()
    await db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    project_id: int,
    node_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    node = await db.get(Node, node_id)
    if not node or node.project_id != project_id:
        raise HTTPException(status_code=404, detail="Node not found")
    await db.delete(node)
    await db.commit()


# ─── Edges ──────────────────────────────────────────────────────────────────

@router.post("/edges", response_model=EdgeResponse, status_code=201)
async def create_edge(
    project_id: int,
    data: EdgeCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)

    src = await db.execute(
        select(Node).where(Node.project_id == project_id, Node.external_id == data.source_external_id)
    )
    source = src.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail=f"Source node '{data.source_external_id}' not found")

    tgt = await db.execute(
        select(Node).where(Node.project_id == project_id, Node.external_id == data.target_external_id)
    )
    target = tgt.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"Target node '{data.target_external_id}' not found")

    edge = Edge(
        project_id=project_id,
        source_id=source.id,
        target_id=target.id,
        relationship_type=data.relationship_type,
        label=data.label,
        properties=data.properties,
        weight=data.weight,
        is_directed=data.is_directed,
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)

    project = await db.get(Project, project_id)
    if project:
        project.edge_count += 1
        await db.commit()

    return edge


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(
    project_id: int,
    edge_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    edge = await db.get(Edge, edge_id)
    if not edge or edge.project_id != project_id:
        raise HTTPException(status_code=404, detail="Edge not found")
    await db.delete(edge)
    await db.commit()


# ─── Import ─────────────────────────────────────────────────────────────────

@router.post("/import/json", response_model=BulkImportResponse)
async def import_json(
    project_id: int,
    replace: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    await get_project_or_403(project_id, current_user.id, db)
    content = await file.read()
    try:
        data = await GraphEngine.process_json(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    return await GraphEngine.bulk_import(project_id, data, db, replace)


@router.post("/import/csv", response_model=BulkImportResponse)
async def import_csv(
    project_id: int,
    replace: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    await get_project_or_403(project_id, current_user.id, db)
    content = await file.read()
    try:
        data = await GraphEngine.process_csv(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
    return await GraphEngine.bulk_import(project_id, data, db, replace)


@router.post("/import/raw", response_model=BulkImportResponse)
async def import_raw(
    project_id: int,
    data: BulkImportData,
    replace: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    return await GraphEngine.bulk_import(project_id, data, db, replace)


# ─── Schema ─────────────────────────────────────────────────────────────────

@router.get("/schema", response_model=list[SchemaDefinitionResponse])
async def get_schema(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    result = await db.execute(
        select(SchemaDefinition).where(SchemaDefinition.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/schema", response_model=SchemaDefinitionResponse, status_code=201)
async def create_schema(
    project_id: int,
    data: SchemaDefinitionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    schema = SchemaDefinition(
        project_id=project_id,
        name=data.name,
        schema_type=data.schema_type,
        color=data.color,
        icon=data.icon,
        properties_schema=data.properties_schema,
    )
    db.add(schema)
    await db.commit()
    await db.refresh(schema)
    return schema


@router.delete("/schema/{schema_id}", status_code=204)
async def delete_schema(
    project_id: int,
    schema_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    schema = await db.get(SchemaDefinition, schema_id)
    if not schema or schema.project_id != project_id:
        raise HTTPException(status_code=404, detail="Schema not found")
    await db.delete(schema)
    await db.commit()


# ─── Clear ──────────────────────────────────────────────────────────────────

@router.delete("/clear", status_code=204)
async def clear_graph(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_or_403(project_id, current_user.id, db)
    await db.execute(delete(Edge).where(Edge.project_id == project_id))
    await db.execute(delete(Node).where(Node.project_id == project_id))
    project = await db.get(Project, project_id)
    if project:
        project.node_count = 0
        project.edge_count = 0
    await db.commit()
