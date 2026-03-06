"""
api/routers/metadata.py
───────────────────────
Endpoints for SPP dimensions: Geography, Variables, Party Colors.
"""

from typing import Any

from fastapi import APIRouter
from sqlmodel import select

from backend.api.dependencies import DbSession, SecureRoute
from backend.db.models import Country, PartyColorExe, PartyColorLeg, State, VariableDictionary

router = APIRouter()

# ── Geography ────────────────────────────────────────────────────────

@router.get("/geography/countries", response_model=list[dict[str, Any]])
def get_countries(session: DbSession, api_key: SecureRoute) -> Any:
    """List all supported countries and their bounding boxes."""
    countries = session.exec(select(Country)).all()
    return [{"id": c.id, "name": c.name, "code": c.code, "bbox": [c.bbox_lng1, c.bbox_lat1, c.bbox_lng2, c.bbox_lat2]} for c in countries]

@router.get("/geography/states", response_model=list[dict[str, Any]])
def get_states(session: DbSession, api_key: SecureRoute, country_id: int | None = None) -> Any:
    """List subnational states. Includes geojson geometries."""
    query = select(State)
    if country_id:
        query = query.where(State.country_id == country_id)
    states = session.exec(query).all()
    # geojson geometry can be passed directly to maps
    return [{"id": s.id, "country_id": s.country_id, "country_state_code": s.country_state_code, "name": s.name, "geometry": s.geom_json} for s in states]

# ── Variables ────────────────────────────────────────────────────────

@router.get("/variables", response_model=Any)
def get_variables(session: DbSession, api_key: SecureRoute, dataset: str | None = None) -> Any:
    """List variable definitions from dict_new (types, palettes, UI text)."""
    query = select(VariableDictionary)
    if dataset:
        query = query.where(VariableDictionary.dataset == dataset)
    variables = session.exec(query).all()
    return variables

# ── Party Colors ─────────────────────────────────────────────────────

@router.get("/party-colors/exe", response_model=Any)
def get_party_colors_exe(session: DbSession, api_key: SecureRoute, country_name: str | None = None) -> Any:
    """Executive map party styling configurations."""
    query = select(PartyColorExe).order_by(PartyColorExe.importance.desc())  # type: ignore
    if country_name:
        query = query.where(PartyColorExe.country_name == country_name)
    return session.exec(query).all()

@router.get("/party-colors/leg", response_model=Any)
def get_party_colors_leg(session: DbSession, api_key: SecureRoute, country_name: str | None = None) -> Any:
    """Legislative hemicycle styling configurations."""
    query = select(PartyColorLeg).order_by(PartyColorLeg.importance.desc())  # type: ignore
    if country_name:
        query = query.where(PartyColorLeg.country_name == country_name)
    return session.exec(query).all()
