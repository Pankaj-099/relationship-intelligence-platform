import json
import csv
import io
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.models.graph import Node, Edge, SchemaDefinition
from app.models.project import Project
from app.schemas.graph import BulkImportData, BulkImportResponse, NodeCreate, EdgeCreate


class GraphEngine:

    @staticmethod
    async def process_json(content: str) -> BulkImportData:
        """Parse JSON into nodes and edges"""
        data = json.loads(content)

        nodes = []
        edges = []

        # Support multiple formats
        # Format 1: {"nodes": [...], "edges": [...]}
        if isinstance(data, dict) and "nodes" in data:
            for n in data.get("nodes", []):
                nodes.append(NodeCreate(
                    external_id=str(n.get("id", n.get("external_id", ""))),
                    label=str(n.get("label", n.get("name", ""))),
                    node_type=str(n.get("type", n.get("node_type", "default"))),
                    properties={k: v for k, v in n.items()
                                if k not in ["id", "external_id", "label", "name", "type", "node_type"]},
                    position_x=float(n.get("x", n.get("position_x", 0))),
                    position_y=float(n.get("y", n.get("position_y", 0))),
                    color=n.get("color"),
                ))
            for e in data.get("edges", data.get("links", [])):
                edges.append(EdgeCreate(
                    source_external_id=str(e.get("source", e.get("from", e.get("source_id", "")))),
                    target_external_id=str(e.get("target", e.get("to", e.get("target_id", "")))),
                    relationship_type=str(e.get("type", e.get("relationship_type", e.get("label", "relates_to")))),
                    label=e.get("label"),
                    weight=float(e.get("weight", 1.0)),
                    properties={k: v for k, v in e.items()
                                if k not in ["source", "target", "from", "to", "type",
                                             "relationship_type", "label", "weight"]},
                ))

        # Format 2: [{"id": "1", "name": "Alice", "connects_to": "2"}, ...]
        elif isinstance(data, list):
            for item in data:
                nodes.append(NodeCreate(
                    external_id=str(item.get("id", item.get("external_id", ""))),
                    label=str(item.get("label", item.get("name", item.get("title", "")))),
                    node_type=str(item.get("type", item.get("node_type", "default"))),
                    properties={k: v for k, v in item.items()
                                if k not in ["id", "external_id", "label", "name", "title", "type", "node_type"]},
                ))

        return BulkImportData(nodes=nodes, edges=edges)

    @staticmethod
    async def process_csv(content: str) -> BulkImportData:
        """Parse CSV into nodes and edges"""
        nodes = []
        edges = []

        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)

        if not rows:
            return BulkImportData(nodes=nodes, edges=edges)

        headers = [h.lower().strip() for h in reader.fieldnames or []]
        has_source = any(h in headers for h in ["source", "from", "source_id"])
        has_target = any(h in headers for h in ["target", "to", "target_id"])

        # Edge list CSV: source, target, relationship_type
        if has_source and has_target:
            seen_nodes = set()
            for row in rows:
                src = str(row.get("source", row.get("from", row.get("source_id", "")))).strip()
                tgt = str(row.get("target", row.get("to", row.get("target_id", "")))).strip()
                rel = str(row.get("relationship_type", row.get("type", row.get("label", "relates_to")))).strip()

                if src and src not in seen_nodes:
                    nodes.append(NodeCreate(external_id=src, label=src, node_type="default", properties={}))
                    seen_nodes.add(src)
                if tgt and tgt not in seen_nodes:
                    nodes.append(NodeCreate(external_id=tgt, label=tgt, node_type="default", properties={}))
                    seen_nodes.add(tgt)
                if src and tgt:
                    edges.append(EdgeCreate(
                        source_external_id=src,
                        target_external_id=tgt,
                        relationship_type=rel,
                        properties={k: v for k, v in row.items()
                                    if k.lower() not in ["source", "target", "from", "to",
                                                         "source_id", "target_id", "type",
                                                         "relationship_type", "label"]},
                    ))
        # Node list CSV: id, name, type, ...
        else:
            for row in rows:
                ext_id = str(row.get("id", row.get("external_id", ""))).strip()
                label = str(row.get("label", row.get("name", row.get("title", ext_id)))).strip()
                node_type = str(row.get("type", row.get("node_type", "default"))).strip()
                if ext_id:
                    nodes.append(NodeCreate(
                        external_id=ext_id,
                        label=label,
                        node_type=node_type,
                        properties={k: v for k, v in row.items()
                                    if k.lower() not in ["id", "external_id", "label",
                                                         "name", "title", "type", "node_type"]},
                    ))

        return BulkImportData(nodes=nodes, edges=edges)

    @staticmethod
    async def bulk_import(
        project_id: int,
        data: BulkImportData,
        db: AsyncSession,
        replace: bool = False,
    ) -> BulkImportResponse:
        """Import nodes and edges into the database"""

        if replace:
            await db.execute(delete(Edge).where(Edge.project_id == project_id))
            await db.execute(delete(Node).where(Node.project_id == project_id))
            await db.flush()

        nodes_created = 0
        nodes_skipped = 0
        edges_created = 0
        edges_skipped = 0
        errors = []

        # external_id → db id mapping
        node_map: dict[str, int] = {}

        # Load existing nodes
        result = await db.execute(select(Node).where(Node.project_id == project_id))
        existing_nodes = result.scalars().all()
        for n in existing_nodes:
            node_map[n.external_id] = n.id

        # Insert nodes (skip duplicates)
        for node_data in data.nodes:
            if not node_data.external_id:
                errors.append("Node missing external_id, skipped")
                nodes_skipped += 1
                continue

            if node_data.external_id in node_map:
                nodes_skipped += 1
                continue

            node = Node(
                project_id=project_id,
                external_id=node_data.external_id,
                label=node_data.label or node_data.external_id,
                node_type=node_data.node_type or "default",
                properties=node_data.properties or {},
                position_x=node_data.position_x,
                position_y=node_data.position_y,
                color=node_data.color,
                size=node_data.size,
            )
            db.add(node)
            await db.flush()
            node_map[node.external_id] = node.id
            nodes_created += 1

        # Insert edges
        for edge_data in data.edges:
            src_id = node_map.get(edge_data.source_external_id)
            tgt_id = node_map.get(edge_data.target_external_id)

            if not src_id:
                errors.append(f"Source node '{edge_data.source_external_id}' not found, edge skipped")
                edges_skipped += 1
                continue
            if not tgt_id:
                errors.append(f"Target node '{edge_data.target_external_id}' not found, edge skipped")
                edges_skipped += 1
                continue

            # Check duplicate edge
            result = await db.execute(
                select(Edge).where(
                    Edge.project_id == project_id,
                    Edge.source_id == src_id,
                    Edge.target_id == tgt_id,
                    Edge.relationship_type == edge_data.relationship_type,
                )
            )
            if result.scalar_one_or_none():
                edges_skipped += 1
                continue

            edge = Edge(
                project_id=project_id,
                source_id=src_id,
                target_id=tgt_id,
                relationship_type=edge_data.relationship_type or "relates_to",
                label=edge_data.label,
                properties=edge_data.properties or {},
                weight=edge_data.weight,
                is_directed=edge_data.is_directed,
            )
            db.add(edge)
            edges_created += 1

        # Update project counts
        result = await db.execute(
            select(func.count(Node.id)).where(Node.project_id == project_id)
        )
        node_count = result.scalar() or 0

        result = await db.execute(
            select(func.count(Edge.id)).where(Edge.project_id == project_id)
        )
        edge_count = result.scalar() or 0

        project = await db.get(Project, project_id)
        if project:
            project.node_count = node_count + nodes_created
            project.edge_count = edge_count + edges_created

        await db.flush()

        return BulkImportResponse(
            nodes_created=nodes_created,
            edges_created=edges_created,
            nodes_skipped=nodes_skipped,
            edges_skipped=edges_skipped,
            errors=errors[:10],
        )

    @staticmethod
    def assign_positions(nodes: list[Node]) -> list[Node]:
        """Auto-assign circular positions to nodes without position"""
        import math
        unpositioned = [n for n in nodes if n.position_x == 0 and n.position_y == 0]
        total = len(unpositioned)
        if total == 0:
            return nodes
        radius = max(200, total * 30)
        for i, node in enumerate(unpositioned):
            angle = (2 * math.pi * i) / total
            node.position_x = radius * math.cos(angle)
            node.position_y = radius * math.sin(angle)
        return nodes
