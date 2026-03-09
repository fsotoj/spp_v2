"""
api/routers/data.py
───────────────────
Core endpoints for querying EAV data and pivoting it to wide format
for the frontend.
"""

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from api.dependencies import DbSession, SecureRoute
from db.models import Observation, PartyObservation, VariableDictionary

router = APIRouter()


@router.get("/party-observation-years", response_model=list[int])
def get_party_observation_years(
    session: DbSession,
    api_key: SecureRoute,
    state_id: int = Query(...),
    chamber: str = Query(...),
) -> Any:
    """
    Returns sorted list of distinct years that have SLED party observation data
    for the given state and chamber. Used to populate the Camera year selector.
    """
    # Only return years where an election was actually held:
    # join to the date_election_sub_leg variable and require a non-null value.
    # Verified equivalent to is_carryover=0 for ARG across all 24 states,
    # and works generically for BRA/MEX (which always have date populated).
    date_var = (
        select(VariableDictionary.id)
        .where(VariableDictionary.variable == "date_election_sub_leg")
        .scalar_subquery()
    )
    election_years = (
        select(PartyObservation.year)
        .where(PartyObservation.state_id == state_id)
        .where(PartyObservation.chamber == chamber)
        .where(PartyObservation.dataset == "SLED")
        .where(PartyObservation.variable_id == date_var)
        .where(
            (PartyObservation.value_text != None)
            | (PartyObservation.value_numeric != None)
        )
        .distinct()
    )
    results = session.exec(election_years).all()
    return sorted(results)

@router.get("/observations", response_model=list[dict[str, Any]])
def get_observations(
    session: DbSession,
    api_key: SecureRoute,
    dataset: str = Query(..., description="NED, SED, SEED, SDI, or SLED_SNAPSHOT"),
    country_id: int | None = None,
    state_id: int | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
) -> Any:
    """
    Fetch entity-level EAV rows and dynamically pivot them into
    wide-format dictionaries.
    Returns: list of dicts with keys (state_id, country_id, year, var1, var2...)
    """
    query = select(Observation, VariableDictionary).join(VariableDictionary)
    
    datasets = [d.strip() for d in dataset.split(',')]
    if len(datasets) > 1:
        query = query.where(Observation.dataset.in_(datasets))
    else:
        query = query.where(Observation.dataset == datasets[0])
    
    if country_id is not None:
        query = query.where(Observation.country_id == country_id)
    if state_id is not None:
        query = query.where(Observation.state_id == state_id)
    if year_min is not None:
        query = query.where(Observation.year >= year_min)
    if year_max is not None:
        query = query.where(Observation.year <= year_max)

    results = session.exec(query).all()

    # Pivot: group by (state_id, country_id, year)
    pivoted: dict[tuple, dict[str, Any]] = defaultdict(dict)
    
    for obs, var in results:
        key = (obs.state_id, obs.country_id, obs.year)
        if not pivoted[key]:
            pivoted[key] = {
                "state_id": obs.state_id,
                "country_id": obs.country_id,
                "year": obs.year,
            }
        
        # Add the metric column (prefer numeric, fallback text)
        val = obs.value_numeric if obs.value_numeric is not None else obs.value_text
        pivoted[key][var.variable] = val

    return list(pivoted.values())


@router.get("/party-observations", response_model=list[dict[str, Any]])
def get_party_observations(
    session: DbSession,
    api_key: SecureRoute,
    dataset: str = Query(default="SLED", description="SLED (all countries)"),
    state_id: int | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    chamber: str | None = None,
    party_name: str | None = None,
) -> Any:
    """
    Fetch party-level EAV rows (SLED unified) and dynamically pivot them into
    wide-format dictionaries.
    Returns: list of dicts with keys (state_id, year, chamber, party_name,
             is_carryover, coalition_name, is_coalition, var1, var2...)
    """
    query = select(PartyObservation, VariableDictionary).join(VariableDictionary)
    query = query.where(PartyObservation.dataset == dataset)

    if state_id is not None:
        query = query.where(PartyObservation.state_id == state_id)
    if year_min is not None:
        query = query.where(PartyObservation.year >= year_min)
    if year_max is not None:
        query = query.where(PartyObservation.year <= year_max)
    if chamber is not None:
        query = query.where(PartyObservation.chamber == chamber)
    if party_name is not None:
        query = query.where(PartyObservation.party_name == party_name)

    results = session.exec(query).all()

    # Pivot: group by (state_id, year, chamber, party_name, is_carryover)
    # is_carryover must be part of the key because ARG election years have two
    # cohorts for the same party: newly-elected (is_carryover=0) and seats held
    # from a prior election (is_carryover=1). Collapsing them would overwrite
    # the seat count of one cohort with the other.
    pivoted: dict[tuple, dict[str, Any]] = defaultdict(dict)

    for obs, var in results:
        key = (obs.state_id, obs.year, obs.chamber, obs.party_name, obs.is_carryover)
        if not pivoted[key]:
            pivoted[key] = {
                "state_id":        obs.state_id,
                "year":            obs.year,
                "chamber":         obs.chamber,
                "party_name":      obs.party_name,
                # Structural metadata — always included for frontend use
                "is_carryover":    obs.is_carryover,
                "origin_year":     obs.origin_year,
                "expire_year":     obs.expire_year,
                "coalition_name":  obs.coalition_name,
                "is_coalition":    obs.is_coalition,
            }

        val = obs.value_numeric if obs.value_numeric is not None else obs.value_text
        pivoted[key][var.variable] = val

    return list(pivoted.values())

