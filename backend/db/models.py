"""
db/models.py
────────────
SQLModel table definitions for the SPP V2 relational database.

Architecture — Fully Dynamic (zero hardcoded variable columns)
──────────────────────────────────────────────────────────────
  DIMENSIONS : Country, State, VariableDictionary, PartyColorExe, PartyColorLeg
  FACTS:
    Observation      → EAV for state/country-level metrics (NED, SED, SEED, SDI, SLED snapshot)
    PartyObservation → EAV for party-level metrics (SLED raw, SLED_ARG)
  AUDIT:
    ValidationLog    → ETL warnings/errors

Every metric is stored as a row keyed by variable_id.
Adding new variables requires only updating dict_new.xlsx, not this file.
"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


# ═══════════════════════════════════════════════════════════════════════
# DIMENSION TABLES
# ═══════════════════════════════════════════════════════════════════════


class Country(SQLModel, table=True):
    """Sovereign state.  Includes map bounding-box for the frontend."""

    __tablename__ = "dim_country"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="e.g. ARGENTINA")
    code: Optional[str] = Field(default=None, max_length=5, description="ISO numeric e.g. 032")

    bbox_lng1: Optional[float] = None
    bbox_lat1: Optional[float] = None
    bbox_lng2: Optional[float] = None
    bbox_lat2: Optional[float] = None


class State(SQLModel, table=True):
    """Subnational unit (province / estado / state)."""

    __tablename__ = "dim_state"

    id: Optional[int] = Field(default=None, primary_key=True)
    country_id: int = Field(foreign_key="dim_country.id", index=True)
    name: str = Field(index=True, description="e.g. BUENOS AIRES")
    code: Optional[str] = Field(default=None, max_length=5)
    country_state_code: str = Field(index=True, unique=True, description="e.g. 03206")
    region_name: Optional[str] = Field(default=None)

    geom_json: Optional[str] = Field(default=None, description="GeoJSON geometry string")
    name_geom: Optional[str] = Field(default=None, description="state_name_geom from geojson")


class VariableDictionary(SQLModel, table=True):
    """Single source of truth for all indicator metadata.

    Loaded from dict_new.xlsx.  The processor derives all variable lists,
    type mappings, and SLED pivot vars from this table at runtime.
    """

    __tablename__ = "dim_variable_dictionary"

    id: Optional[int] = Field(default=None, primary_key=True)
    variable: str = Field(index=True, unique=True)
    pretty_name: Optional[str] = None
    category: Optional[str] = None
    dataset: Optional[str] = Field(default=None, index=True)
    type_legacy: Optional[str] = Field(default=None, description="Original R palette type")
    type: Optional[str] = Field(default=None, description="Codebook: continuous, discrete, percentage, binary, categorical, text, date, ordinal")
    palette: Optional[str] = Field(default=None)
    viewable_map: Optional[int] = Field(default=0)
    viewable_graph: Optional[int] = Field(default=0)
    scope: Optional[str] = Field(default=None)
    description_for_ui: Optional[str] = None
    add_indices: Optional[str] = None
    pretty_name_es: Optional[str] = None
    dataset_es: Optional[str] = None
    description_for_ui_es: Optional[str] = None
    add_indices_es: Optional[str] = None
    pretty_name_de: Optional[str] = None
    dataset_de: Optional[str] = None
    description_for_ui_de: Optional[str] = None
    add_indices_de: Optional[str] = None


class PartyColorExe(SQLModel, table=True):
    """Executive party styling (party_colors.xlsx)."""

    __tablename__ = "dim_party_color_exe"

    id: Optional[int] = Field(default=None, primary_key=True)
    country_name: str = Field(index=True)
    party_name: str = Field(index=True)
    appearances: Optional[int] = None
    appearances_2000: Optional[int] = None
    votes_winner: Optional[float] = None
    appearances_norm: Optional[float] = None
    appearances_2000_norm: Optional[float] = None
    votes_winner_norm: Optional[float] = None
    importance: Optional[float] = None
    color: Optional[str] = Field(default=None, max_length=10)


class PartyColorLeg(SQLModel, table=True):
    """Legislative party styling (party_colors_leg_v3.xlsx)."""

    __tablename__ = "dim_party_color_leg"

    id: Optional[int] = Field(default=None, primary_key=True)
    country_name: str = Field(index=True)
    party_name: str = Field(index=True)
    appearances: Optional[int] = None
    appearances_2000: Optional[int] = None
    votes: Optional[float] = None
    appearances_norm: Optional[float] = None
    appearances_2000_norm: Optional[float] = None
    importance: Optional[float] = None
    color: Optional[str] = Field(default=None, max_length=10)


# ═══════════════════════════════════════════════════════════════════════
# FACT TABLES — Pure EAV, zero hardcoded variable columns
# ═══════════════════════════════════════════════════════════════════════


class Observation(SQLModel, table=True):
    """Entity-level EAV: one row per (entity × year × variable).

    Covers:
    - NED  (country_id set, state_id NULL)
    - SED, SEED, SDI  (state_id set, country_id NULL)
    - SLED snapshot  (state_id set, dataset='SLED_SNAPSHOT')
    """

    __tablename__ = "fact_observation"

    id: Optional[int] = Field(default=None, primary_key=True)
    state_id: Optional[int] = Field(default=None, foreign_key="dim_state.id", index=True)
    country_id: Optional[int] = Field(default=None, foreign_key="dim_country.id", index=True)
    year: int = Field(index=True)
    variable_id: int = Field(foreign_key="dim_variable_dictionary.id", index=True)
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    dataset: str = Field(index=True, description="NED | SED | SEED | SDI | SLED_SNAPSHOT")


class PartyObservation(SQLModel, table=True):
    """Party-level EAV: one row per (state × year × chamber × party × variable).

    Covers:
    - SLED raw  (main legislative data, dataset='SLED')
    - SLED_ARG  (Argentina live-tenure data, dataset='SLED_ARG')
    """

    __tablename__ = "fact_party_observation"

    id: Optional[int] = Field(default=None, primary_key=True)
    state_id: int = Field(foreign_key="dim_state.id", index=True)
    year: int = Field(index=True)
    chamber: Optional[str] = Field(default=None, index=True, description="1=Lower, 2=Upper")
    party_name: Optional[str] = Field(default=None, index=True)
    variable_id: int = Field(foreign_key="dim_variable_dictionary.id", index=True)
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    dataset: str = Field(index=True, description="SLED | SLED_ARG")


# ═══════════════════════════════════════════════════════════════════════
# AUDIT TABLE
# ═══════════════════════════════════════════════════════════════════════


class ValidationLog(SQLModel, table=True):
    """Records warnings and errors from ETL validation passes."""

    __tablename__ = "etl_validation_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    level: str = Field(description="WARNING | ERROR | INFO")
    category: str = Field(index=True)
    message: str
    source_file: Optional[str] = Field(default=None)
    variable_or_party: Optional[str] = Field(default=None, index=True)
    created_at: Optional[str] = Field(default=None)
