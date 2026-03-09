"""
core/processor.py
─────────────────
Fully dictionary-driven ETL — zero hardcoded variable lists or columns.

All variable metadata comes from dict_new.xlsx.
All fact data stored as EAV rows in Observation or PartyObservation.
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl
from sqlmodel import Session, select

from core.config import get_settings
from db.models import (
    Country,
    Observation,
    PartyColorExe,
    PartyColorLeg,
    PartyObservation,
    State,
    ValidationLog,
    VariableDictionary,
)
from db.session import create_db_and_tables, engine

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────

COUNTRY_BBOXES = {
    "ARGENTINA": {"lng1": -73.5, "lat1": -59, "lng2": -56, "lat2": -21.8},
    "BRAZIL": {"lng1": -73.9, "lat1": -33.7, "lng2": -44.5, "lat2": 5.3},
    "MEXICO": {"lng1": -118.5, "lat1": 12.5, "lng2": -84.7, "lat2": 34.7},
}

# Identity/key columns — never treated as variables
KEY_COLUMNS = {
    "country_name", "country_code", "state_name", "state_code",
    "country_state_code", "region_name", "year",
}

# SLED-specific key columns (identity at party-level grain)
# Includes structural metadata added by the etl/ pipeline — not analytical variables.
SLED_KEY_COLUMNS = KEY_COLUMNS | {
    "chamber_election_sub_leg", "party_name_sub_leg",
    # ARG tenure metadata
    "origin_year", "expire_year", "is_carryover",
    # ARG name audit trail (not used for DB loading — party_name_sub_leg is the source of truth)
    "party_name_sled_arg", "legacy_party_name_sub_leg",
    # MEX coalition metadata
    "coalition_name", "is_coalition", "seat_sum_mismatch",
}

# Dataset file mapping: logical name → (filename, grain, entity_key_column)
DATASETS = {
    "NED": ("NED (v.0.1).xlsx", "national", "country_name"),
    "SED": ("SED (v.0.1).xlsx", "subnational", "country_state_code"),
    "SEED": ("SEED SHINY (v.0.1).xlsx", "subnational", "country_state_code"),
    "SDI": ("SDI (v.1).xlsx", "subnational", "country_state_code"),
}

NUMERIC_TYPES = {"continuous", "discrete", "percentage", "binary"}


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════


def _read_xlsx(path: Path) -> list[dict[str, Any]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(next(rows_iter))]
    data = [{h: v for h, v in zip(headers, row)} for row in rows_iter]
    wb.close()
    logger.info("Read %d rows from %s", len(data), path.name)
    return data


def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _safe_str(v: Any) -> str | None:
    if v is None:
        return None
    return str(v).strip()


def _safe_csc(v: Any) -> str | None:
    """Normalize country_state_code to a 5-digit zero-padded string.

    Excel reads numeric codes (e.g. 3206, 7612) as integers, but the DB stores
    them as zero-padded strings (e.g. '03206', '07612').  This helper normalises
    both representations to the canonical DB format.
    """
    raw = _safe_str(v)
    if raw is None:
        return None
    # Strip any decimal part that openpyxl/pandas may add (e.g. "3206.0")
    if "." in raw:
        raw = raw.split(".")[0]
    return raw.zfill(5)


def _is_numeric(v: Any) -> bool:
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return True
    try:
        float(v)
        return True
    except (ValueError, TypeError):
        return False


def _coerce_value(raw: Any, vtype: str) -> tuple[float | None, str | None]:
    """Return (value_numeric, value_text) based on variable type."""
    if raw is None:
        return None, None
    if vtype in NUMERIC_TYPES and _is_numeric(raw):
        return _safe_float(raw), None
    if _is_numeric(raw) and vtype not in ("categorical", "ordinal", "text", "date"):
        return _safe_float(raw), None
    return None, _safe_str(raw)


# ═══════════════════════════════════════════════════════════════════════
# Main Processor
# ═══════════════════════════════════════════════════════════════════════


class SPPProcessor:

    def __init__(self, data_dir: str | Path = "data/raw") -> None:
        self.data_dir = Path(data_dir)
        self._country_map: dict[str, int] = {}
        self._state_map: dict[str, int] = {}
        self._variable_map: dict[str, int] = {}
        self._variable_types: dict[str, str] = {}
        self._variable_datasets: dict[str, str] = {}
        self._variable_viewable_map: dict[str, int] = {}
        self._validation_logs: list[dict] = []
        self._sled_pivot_vars: list[str] = []

    # ── Validation ───────────────────────────────────────────────

    def _log_validation(self, level: str, category: str, message: str,
                        source_file: str | None = None,
                        variable_or_party: str | None = None) -> None:
        self._validation_logs.append({
            "level": level, "category": category, "message": message,
            "source_file": source_file, "variable_or_party": variable_or_party,
        })
        (logger.warning if level == "WARNING" else logger.info)(
            "[%s] %s: %s", level, category, message)

    def _flush_validation_logs(self, session: Session) -> None:
        ts = datetime.now().isoformat()
        for e in self._validation_logs:
            session.add(ValidationLog(
                level=e["level"], category=e["category"], message=e["message"],
                source_file=e.get("source_file"),
                variable_or_party=e.get("variable_or_party"), created_at=ts,
            ))
        session.flush()
        logger.info("Flushed %d validation log entries", len(self._validation_logs))

    # ── Entry point ──────────────────────────────────────────────

    def run(self) -> None:
        logger.info("═══ SPP V2 ETL Pipeline starting ═══")
        create_db_and_tables()

        with Session(engine) as session:
            # 1. Dictionary (source of truth)
            self._insert_variable_dictionary(session)
            self._derive_sled_pivot_vars()

            # 2. Dimensions
            self._insert_countries(session)
            self._insert_states(session)
            self._insert_party_colors_exe(session)
            self._insert_party_colors_leg(session)

            # 3. Entity-level EAV (NED, SED, SEED, SDI)
            for ds_name, (fname, grain, key) in DATASETS.items():
                self._insert_observations(session, ds_name, fname, grain, key)

            # 4. Party-level EAV (SLED unified: ARG + BRA + MEX)
            self._insert_sled_party_observations(session)

            # 5. SLED snapshot → Observation EAV with suffixed var names
            self._insert_sled_snapshot(session)

            # 6. Party validation
            self._validate_party_colors(session)

            # 7. Audit
            self._flush_validation_logs(session)
            session.commit()

        logger.info("═══ ETL Pipeline complete ═══")

    # ── 1. Variable Dictionary ───────────────────────────────────

    def _insert_variable_dictionary(self, session: Session) -> None:
        rows = _read_xlsx(self.data_dir / "dict_new.xlsx")
        for r in rows:
            var_name = _safe_str(r.get("variable"))
            if not var_name:
                continue
            session.add(VariableDictionary(
                variable=var_name,
                pretty_name=_safe_str(r.get("pretty_name")),
                category=_safe_str(r.get("category")),
                dataset=_safe_str(r.get("dataset")),
                type_legacy=_safe_str(r.get("type_legacy")),
                type=_safe_str(r.get("type")),
                palette=_safe_str(r.get("palette")),
                viewable_map=_safe_int(r.get("viewable_map")),
                viewable_graph=_safe_int(r.get("viewable_graph")),
                scope=_safe_str(r.get("scope")),
                description_for_ui=_safe_str(r.get("description_for_ui")),
                add_indices=_safe_str(r.get("add_indices")),
                pretty_name_es=_safe_str(r.get("pretty_name_es")),
                dataset_es=_safe_str(r.get("dataset_es")),
                description_for_ui_es=_safe_str(r.get("description_for_ui_es")),
                add_indices_es=_safe_str(r.get("add_indices_es")),
                pretty_name_de=_safe_str(r.get("pretty_name_de")),
                dataset_de=_safe_str(r.get("dataset_de")),
                description_for_ui_de=_safe_str(r.get("description_for_ui_de")),
                add_indices_de=_safe_str(r.get("add_indices_de")),
            ))
        session.flush()

        for v in session.exec(select(VariableDictionary)):
            self._variable_map[v.variable] = v.id
            self._variable_types[v.variable] = v.type or "continuous"
            self._variable_datasets[v.variable] = v.dataset or ""
            self._variable_viewable_map[v.variable] = v.viewable_map or 0

        logger.info("Loaded %d variables into dictionary", len(self._variable_map))

    def _derive_sled_pivot_vars(self) -> None:
        """Derive SLED pivot vars from dictionary:
        filter(dataset == 'Legislative Elections', viewable_map == 1)"""
        self._sled_pivot_vars = sorted([
            v for v, ds in self._variable_datasets.items()
            if ds == "Legislative Elections" and self._variable_viewable_map.get(v, 0) == 1
        ])
        logger.info("Derived %d SLED pivot vars from dictionary", len(self._sled_pivot_vars))

    # ── 2. Dimensions ────────────────────────────────────────────

    def _insert_countries(self, session: Session) -> None:
        rows = _read_xlsx(self.data_dir / "SED (v.0.1).xlsx")
        seen = set()
        for r in rows:
            name = _safe_str(r.get("country_name"))
            if not name or name in seen:
                continue
            seen.add(name)
            bbox = COUNTRY_BBOXES.get(name, {})
            session.add(Country(
                name=name, code=_safe_str(r.get("country_code")),
                bbox_lng1=bbox.get("lng1"), bbox_lat1=bbox.get("lat1"),
                bbox_lng2=bbox.get("lng2"), bbox_lat2=bbox.get("lat2"),
            ))
        session.flush()
        for c in session.exec(select(Country)):
            self._country_map[c.name] = c.id
        logger.info("Inserted %d countries", len(self._country_map))

    def _insert_states(self, session: Session) -> None:
        rows = _read_xlsx(self.data_dir / "SED (v.0.1).xlsx")
        seen = set()
        geom_lookup: dict[str, dict] = {}
        gj_path = self.data_dir.parent / "geo" / "geom_simple_maps.geojson"
        if gj_path.exists():
            with open(gj_path, encoding="utf-8") as f:
                gj = json.load(f)
            for feat in gj.get("features", []):
                props = feat.get("properties", {})
                csc = _safe_str(props.get("country_state_code"))
                if csc:
                    geom_lookup[csc] = {
                        "geometry": json.dumps(feat.get("geometry")),
                        "name_geom": _safe_str(props.get("state_name_geom")),
                    }
        for r in rows:
            csc = _safe_csc(r.get("country_state_code"))
            if not csc or csc in seen:
                continue
            seen.add(csc)
            cid = self._country_map.get(_safe_str(r.get("country_name")))
            if cid is None:
                continue
            geo = geom_lookup.get(csc, {})
            session.add(State(
                country_id=cid, name=_safe_str(r.get("state_name")) or "",
                code=_safe_str(r.get("state_code")), country_state_code=csc,
                region_name=_safe_str(r.get("region_name")),
                geom_json=geo.get("geometry"), name_geom=geo.get("name_geom"),
            ))
        session.flush()
        for s in session.exec(select(State)):
            self._state_map[s.country_state_code] = s.id
        logger.info("Inserted %d states", len(self._state_map))

    def _insert_party_colors_exe(self, session: Session) -> None:
        rows = _read_xlsx(self.data_dir / "party_colors.xlsx")
        for r in rows:
            session.add(PartyColorExe(
                country_name=_safe_str(r.get("country_name")) or "",
                party_name=_safe_str(r.get("head_party_sub_exe")) or "",
                appearances=_safe_int(r.get("appearances")),
                appearances_2000=_safe_int(r.get("appearances_2000")),
                votes_winner=_safe_float(r.get("votes_winner")),
                appearances_norm=_safe_float(r.get("appearances_norm")),
                appearances_2000_norm=_safe_float(r.get("appearances_2000_norm")),
                votes_winner_norm=_safe_float(r.get("votes_winner_norm")),
                importance=_safe_float(r.get("importance")),
                color=_safe_str(r.get("color")),
            ))
        session.flush()
        logger.info("Inserted %d executive party colors", len(rows))

    def _insert_party_colors_leg(self, session: Session) -> None:
        rows = _read_xlsx(self.data_dir / "party_colors_leg_v3.xlsx")
        for r in rows:
            session.add(PartyColorLeg(
                country_name=_safe_str(r.get("country_name")) or "",
                party_name=_safe_str(r.get("party_name_sub_leg")) or "",
                appearances=_safe_int(r.get("appearances")),
                appearances_2000=_safe_int(r.get("appearances_2000")),
                votes=_safe_float(r.get("votes")),
                appearances_norm=_safe_float(r.get("appearances_norm")),
                appearances_2000_norm=_safe_float(r.get("appearances_2000_norm")),
                importance=_safe_float(r.get("importance")),
                color=_safe_str(r.get("color")),
            ))
        session.flush()
        logger.info("Inserted %d legislative party colors", len(rows))

    # ── 3. Entity-level EAV ──────────────────────────────────────

    def _get_or_create_variable(self, session: Session, var_name: str, source_file: str) -> int | None:
        if var_name in self._variable_map:
            return self._variable_map[var_name]
        self._log_validation("WARNING", "MISSING_VARIABLE",
                             f"Column '{var_name}' in {source_file} missing from dict_new.xlsx. Auto-registered.",
                             source_file, var_name)
        new_var = VariableDictionary(variable=var_name,
                                     pretty_name=var_name.replace("_", " ").title(),
                                     scope="subnational", type="continuous")
        session.add(new_var)
        session.flush()
        self._variable_map[var_name] = new_var.id
        self._variable_types[var_name] = "continuous"
        return new_var.id

    def _insert_observations(self, session: Session, dataset_name: str,
                              filename: str, grain: str, entity_key: str) -> None:
        path = self.data_dir / filename
        if not path.exists():
            logger.warning("%s not found, skipping", filename)
            return
        rows = _read_xlsx(path)
        if not rows:
            return

        metric_cols = sorted(set(rows[0].keys()) - KEY_COLUMNS)
        var_ids = {col: self._get_or_create_variable(session, col, filename)
                   for col in metric_cols}

        count = 0
        for r in rows:
            year = _safe_int(r.get("year"))
            if year is None:
                continue
            sid, cid = None, None
            if grain == "national":
                cid = self._country_map.get(_safe_str(r.get(entity_key)))
                if cid is None:
                    continue
            else:
                sid = self._state_map.get(_safe_str(r.get(entity_key)))
                if sid is None:
                    continue

            for col in metric_cols:
                raw = r.get(col)
                if raw is None:
                    continue
                vid = var_ids.get(col)
                if vid is None:
                    continue
                vn, vt = _coerce_value(raw, self._variable_types.get(col, "continuous"))
                session.add(Observation(
                    state_id=sid, country_id=cid, year=year,
                    variable_id=vid, value_numeric=vn, value_text=vt,
                    dataset=dataset_name,
                ))
                count += 1
        session.flush()
        logger.info("Inserted %d observations from %s (%s)", count, dataset_name, filename)

    # ── 4. Party-level EAV (SLED unified) ────────────────────────

    def _bind_sled(self) -> list[dict]:
        """Read SLED_unified.xlsx — single source of truth for all SLED data.

        Produced by backend/etl/sled_final_merge.py which combines:
          - SLED mother (ARG + BRA election rows, ARG carryover rows)
          - SLED_mex_expanded (MEX party-level, coalition-expanded)
        """
        path = self.data_dir / "SLED_unified.xlsx"
        if not path.exists():
            logger.warning("SLED_unified.xlsx not found, skipping SLED pipeline")
            return []
        rows = _read_xlsx(path)
        logger.info("SLED unified: %d rows loaded", len(rows))
        return rows

    def _insert_sled_party_observations(self, session: Session) -> None:
        """Insert SLED_unified as party-level EAV rows.

        ARG carryover rows (is_carryover=1) are aggregated by
        (country_state_code, year, chamber, party) before insertion to
        correctly sum seats from multiple overlapping tenure windows.
        """
        rows = self._bind_sled()
        if not rows:
            return

        metric_cols = sorted(set(rows[0].keys()) - SLED_KEY_COLUMNS)
        var_ids = {col: self._get_or_create_variable(session, col, "SLED_unified.xlsx")
                   for col in metric_cols}

        # Separate carryover rows and aggregate their seats to handle overlapping
        # tenure windows for the same party in the same year (ARG bicameral renewal).
        carryover_agg: dict[tuple, dict] = {}
        election_rows: list[dict] = []

        for r in rows:
            if _safe_int(r.get("is_carryover")) == 1:
                csc = _safe_csc(r.get("country_state_code"))
                yr  = _safe_int(r.get("year"))
                ch  = _safe_str(r.get("chamber_election_sub_leg"))
                pty = _safe_str(r.get("party_name_sub_leg"))
                if not csc or yr is None:
                    continue
                key = (csc, yr, ch, pty)
                if key not in carryover_agg:
                    carryover_agg[key] = dict(r)
                    carryover_agg[key]["_seats_sum"] = _safe_int(r.get("total_seats_party_sub_leg")) or 0
                else:
                    carryover_agg[key]["_seats_sum"] += _safe_int(r.get("total_seats_party_sub_leg")) or 0
            else:
                election_rows.append(r)

        # Rebuild aggregated carryover rows with summed seats
        for agg_row in carryover_agg.values():
            agg_row["total_seats_party_sub_leg"] = agg_row.pop("_seats_sum")
            election_rows.append(agg_row)

        count = 0
        for r in election_rows:
            csc = _safe_csc(r.get("country_state_code"))
            sid = self._state_map.get(csc)
            if sid is None:
                continue
            year = _safe_int(r.get("year"))
            if year is None:
                continue
            chamber = _safe_str(r.get("chamber_election_sub_leg"))
            # Prefer the canonical SLED_ARG name (no ALIANZA prefix, no diacritics
            # party_name_sub_leg is the single source of truth — resolved to the
            # canonical SLED_ARG name by sled_arg_merge.py before DB loading.
            party = _safe_str(r.get("party_name_sub_leg"))

            # Structural metadata — stored directly on the row, not as EAV variables
            origin_year       = _safe_int(r.get("origin_year"))
            expire_year       = _safe_int(r.get("expire_year"))
            is_carryover      = _safe_int(r.get("is_carryover"))
            coalition_name    = _safe_str(r.get("coalition_name"))
            is_coalition      = _safe_int(r.get("is_coalition"))
            seat_sum_mismatch = _safe_int(r.get("seat_sum_mismatch"))

            for col in metric_cols:
                raw = r.get(col)
                if raw is None:
                    continue
                vid = var_ids.get(col)
                if vid is None:
                    continue
                vn, vt = _coerce_value(raw, self._variable_types.get(col, "continuous"))
                session.add(PartyObservation(
                    state_id=sid, year=year, chamber=chamber,
                    party_name=party, variable_id=vid,
                    value_numeric=vn, value_text=vt, dataset="SLED",
                    origin_year=origin_year, expire_year=expire_year,
                    is_carryover=is_carryover, coalition_name=coalition_name,
                    is_coalition=is_coalition, seat_sum_mismatch=seat_sum_mismatch,
                ))
                count += 1
        session.flush()
        logger.info("Inserted %d party observations from SLED_unified", count)

    # ── 5. SLED Snapshot → Observation EAV ────────────────────────

    def _insert_sled_snapshot(self, session: Session) -> None:
        """Pivot + complete + fill SLED data, then store as Observation EAV
        with suffixed variable names (e.g., enp_sub_leg_1, enp_sub_leg_2).

        ARG carryover rows (is_carryover=1) are excluded — they represent
        inter-election year compositions and lack the election-level metrics
        (ENP, turnover, etc.) needed for the snapshot.
        """
        raw = [r for r in self._bind_sled() if _safe_int(r.get("is_carryover")) != 1]
        pvars = self._sled_pivot_vars
        if not pvars:
            logger.warning("No SLED pivot vars from dictionary, skipping snapshot")
            return

        logger.info("SLED snapshot using %d pivot vars from dictionary", len(pvars))

        # Aggregate to (csc, year, chamber)
        agg: dict[tuple, dict] = {}
        for r in raw:
            csc = _safe_csc(r.get("country_state_code"))
            yr = _safe_int(r.get("year"))
            ch = _safe_str(r.get("chamber_election_sub_leg"))
            if not csc or yr is None or not ch:
                continue
            key = (csc, yr, ch)
            if key not in agg:
                agg[key] = {}
            for var in pvars:
                v = r.get(var)
                if v is not None:
                    agg[key][var] = v

        # Pivot wider by chamber
        pivoted: dict[tuple[str, int], dict] = defaultdict(dict)
        for (csc, yr, ch), vals in agg.items():
            dest = pivoted[(csc, yr)]
            for var in pvars:
                if var in vals:
                    dest[f"{var}_{ch}"] = vals[var]

        # Complete yearly gaps
        csc_yrs: dict[str, list[int]] = defaultdict(list)
        for csc, yr in pivoted:
            csc_yrs[csc].append(yr)

        completed: dict[tuple[str, int], dict] = {}
        for csc, yrs in csc_yrs.items():
            for y in range(min(yrs), max(yrs) + 1):
                k = (csc, y)
                completed[k] = dict(pivoted[k]) if k in pivoted else {}

        # Forward fill (all from dict, not hardcoded)
        fill_cols: list[str] = []
        zero_fill_cols: list[str] = []
        for var in pvars:
            if var == "concurrent_election_with_nat_sub_leg":
                zero_fill_cols.extend([f"{var}_1", f"{var}_2"])
            else:
                fill_cols.extend([f"{var}_1", f"{var}_2"])

        for csc in sorted(csc_yrs.keys()):
            carry: dict[str, Any] = {}
            for y in range(min(csc_yrs[csc]), max(csc_yrs[csc]) + 1):
                row = completed[(csc, y)]
                for col in zero_fill_cols:
                    if row.get(col) is None:
                        row[col] = "0"
                for col in fill_cols:
                    if row.get(col) is not None:
                        carry[col] = row[col]
                    elif col in carry:
                        row[col] = carry[col]

        # Ensure suffixed variables exist in dict (auto-register if needed)
        suffixed_var_ids: dict[str, int | None] = {}
        for var in pvars:
            for sfx in ("_1", "_2"):
                svar = f"{var}{sfx}"
                suffixed_var_ids[svar] = self._get_or_create_variable(session, svar, "SLED_snapshot")

        # Insert as Observation EAV
        count = 0
        for (csc, yr), row in sorted(completed.items()):
            sid = self._state_map.get(csc)
            if sid is None:
                continue

            for svar, vid in suffixed_var_ids.items():
                raw_val = row.get(svar)
                if raw_val is None or vid is None:
                    continue
                # Derive base var type for coercion
                base_var = svar.rsplit("_", 1)[0]
                vtype = self._variable_types.get(base_var, "continuous")
                vn, vt = _coerce_value(raw_val, vtype)
                session.add(Observation(
                    state_id=sid, country_id=None, year=yr, variable_id=vid,
                    value_numeric=vn, value_text=vt, dataset="SLED_SNAPSHOT",
                ))
                count += 1
        session.flush()
        logger.info("Inserted %d SLED snapshot observations", count)

    # ── 6. Party validation ──────────────────────────────────────

    def _validate_party_colors(self, session: Session) -> None:
        # Executive
        exe_names = {pc.party_name for pc in session.exec(select(PartyColorExe))}
        hpid = self._variable_map.get("head_party_sub_exe")
        if hpid:
            data_parties = {p for p in session.exec(
                select(Observation.value_text)
                .where(Observation.variable_id == hpid)
                .where(Observation.value_text.is_not(None)).distinct()  # type: ignore[union-attr]
            ).all() if p}
            missing = data_parties - exe_names
            for p in sorted(missing):
                self._log_validation("WARNING", "MISSING_PARTY_COLOR",
                                     f"Executive party '{p}' has no color", "party_colors.xlsx", p)
            logger.info("Executive parties: %d total, %d missing colors",
                        len(data_parties), len(missing))

        # Legislative
        leg_names = {pc.party_name for pc in session.exec(select(PartyColorLeg))}
        sled_parties = {p for p in session.exec(
            select(PartyObservation.party_name).where(
                PartyObservation.dataset == "SLED"
            ).distinct()
        ).all() if p}
        missing_l = sled_parties - leg_names
        for p in sorted(missing_l):
            self._log_validation("WARNING", "MISSING_PARTY_COLOR",
                                 f"Legislative party '{p}' has no color",
                                 "party_colors_leg_v3.xlsx", p)
        logger.info("Legislative parties: %d total, %d missing colors",
                    len(sled_parties), len(missing_l))


# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    SPPProcessor().run()
