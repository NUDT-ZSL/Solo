from fastapi import APIRouter, HTTPException

from database import get_db
from models import RouteCreate, RouteUpdate
from services.route_service import (
    create_route,
    get_all_routes,
    get_route_by_id,
    update_route,
    delete_route,
)

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.post("")
async def create_route_endpoint(body: RouteCreate):
    route = await create_route("default-user", body.name, body.description)
    return route


@router.get("")
async def list_routes():
    routes = await get_all_routes()
    return routes


@router.get("/{route_id}")
async def get_route_endpoint(route_id: str):
    route = await get_route_by_id(route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.put("/{route_id}")
async def update_route_endpoint(route_id: str, body: RouteUpdate):
    route = await update_route(route_id, body.name, body.description)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.delete("/{route_id}")
async def delete_route_endpoint(route_id: str):
    success = await delete_route(route_id)
    if not success:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}
