import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.project import Project
from app.models.graph import Node, Edge, ActivityLog
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        name=data.name,
        description=data.description,
        owner_id=current_user.id,
        is_public=data.is_public,
        color=data.color,
        icon=data.icon,
        share_token=secrets.token_urlsafe(16) if data.is_public else None,
    )
    db.add(project)
    await db.flush()

    log = ActivityLog(
        user_id=current_user.id,
        project_id=project.id,
        action="project_created",
        entity_type="project",
        entity_id=project.id,
        log_metadata={"name": data.name},
    )
    db.add(log)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()

    count_result = await db.execute(
        select(func.count(Project.id)).where(Project.owner_id == current_user.id)
    )
    total = count_result.scalar() or 0

    return ProjectListResponse(projects=list(projects), total=total)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, current_user.id, db)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, current_user.id, db)

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.is_public is not None:
        project.is_public = data.is_public
        if data.is_public and not project.share_token:
            project.share_token = secrets.token_urlsafe(16)
    if data.color is not None:
        project.color = data.color
    if data.icon is not None:
        project.icon = data.icon

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, current_user.id, db)
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/share", response_model=ProjectResponse)
async def toggle_share(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, current_user.id, db)
    project.is_public = not project.is_public
    if project.is_public and not project.share_token:
        project.share_token = secrets.token_urlsafe(16)
    await db.commit()
    await db.refresh(project)
    return project


async def _get_project_or_404(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project
