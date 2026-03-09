"""
sled_mex_expand.py
------------------
Expand SLED_mex_full.xlsx from coalition/abbreviation grain into party-level rows.

Logic per row:
  1. Parse disaggregated_seats_party_sub_leg.y  →  list of (party_name, seats)
  2. Classify:
       exact_match   – single entry, name == party_name_sub_leg          → is_coalition=0
       abbreviation  – single entry, no hyphen pattern, name differs      → is_coalition=0
       coalition_1   – single entry, hyphen pattern (PAN-NA, PRI-PVEM...) → is_coalition=1
       coalition_n   – multiple entries                                    → is_coalition=1
  3. Expand into N rows (one per disaggregated party)
  4. Column changes:
       coalition_name          (new)  = original party_name_sub_leg
       is_coalition            (new)  = 0 or 1 per above
       party_name_sub_leg      (upd)  = disaggregated party name
       total_seats_party_sub_leg(upd) = disaggregated seat count
       perc_seats_party_sub_leg (upd) = disagg_seats / total_chamber_seats (recomputed)
       disaggregated_seats_*   (drop) = parsed, no longer needed

Run from project root:
    python backend/etl/sled_mex_expand.py

Outputs → backend/etl/output/
    SLED_mex_expanded.xlsx          ready to replace SLED_mex.xlsx in processor.py
    sled_mex_expansion_report.csv   one row per original entry with classification + checks
"""

import re
from pathlib import Path

import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT  = Path(__file__).resolve().parents[2]
RAW   = ROOT / "backend" / "data" / "raw"
OUT   = ROOT / "backend" / "etl" / "output"
OUT.mkdir(parents=True, exist_ok=True)

SLED_MEX_FILE = RAW / "SLED_mex_full.xlsx"

# Pattern: hyphen between uppercase-letter tokens → coalition label (e.g. PAN-NA, PRI-PT-PVEM)
COALITION_HYPHEN = re.compile(r"[A-Z]+-[A-Z]+")

DISAGG_COL  = "disaggregated_seats_party_sub_leg.y"
PARTY_COL   = "party_name_sub_leg"
SEATS_COL   = "total_seats_party_sub_leg"
PERC_S_COL  = "perc_seats_party_sub_leg"
CHAMBER_COL = "total_chamber_seats_sub_leg"


# ── Parser ────────────────────────────────────────────────────────────────────

def parse_disagg(val) -> list[tuple[str, int]]:
    """
    Parse R named-list string  c("PARTY_A=4, PARTY_B=2")
    into [(party_name, seats), ...].
    Returns empty list if val is null or unparseable.
    """
    if not val or pd.isna(val):
        return []
    s = str(val).strip()
    s = re.sub(r"^c\(\"?", "", s)   # strip leading  c("  or  c(
    s = re.sub(r"\"?\)$", "", s)    # strip trailing  ")  or  )
    parts = []
    for entry in s.split(","):
        entry = entry.strip().strip('"')
        if "=" not in entry:
            continue
        last_eq = entry.rfind("=")
        name    = entry[:last_eq].strip()
        seats_s = entry[last_eq + 1:].strip()
        try:
            parts.append((name, int(seats_s)))
        except ValueError:
            pass
    return parts


def classify(coalition_label: str, disagg_parts: list[tuple[str, int]]) -> str:
    """
    Return one of: exact_match | abbreviation | coalition_1 | coalition_n
    """
    if len(disagg_parts) > 1:
        return "coalition_n"
    if len(disagg_parts) == 1:
        disagg_name = disagg_parts[0][0]
        if disagg_name == coalition_label:
            return "exact_match"
        if COALITION_HYPHEN.search(coalition_label):
            return "coalition_1"
        return "abbreviation"
    return "exact_match"  # fallback: no disagg data, treat as is


# ── Main ──────────────────────────────────────────────────────────────────────

print("Loading SLED_mex_full.xlsx ...")
df = pd.read_excel(SLED_MEX_FILE)
print(f"  {len(df):,} rows, {len(df.columns)} columns")

# Sanity: expected columns present
missing = {DISAGG_COL, PARTY_COL, SEATS_COL, CHAMBER_COL} - set(df.columns)
if missing:
    raise ValueError(f"Missing expected columns: {missing}")

# ── Expand ────────────────────────────────────────────────────────────────────

expanded_rows  = []
report_rows    = []

for _, row in df.iterrows():
    coalition_label = str(row[PARTY_COL]).strip() if pd.notna(row[PARTY_COL]) else ""
    orig_seats      = row[SEATS_COL]
    chamber_total   = row[CHAMBER_COL]
    disagg_val      = row[DISAGG_COL]

    parts = parse_disagg(disagg_val)

    if not parts:
        # No disagg data — emit row as-is, treat as exact match
        new_row = row.drop(labels=[DISAGG_COL]).to_dict()
        new_row["coalition_name"]    = coalition_label
        new_row["is_coalition"]      = 0
        new_row["seat_sum_mismatch"] = 0
        expanded_rows.append(new_row)
        report_rows.append({
            "state":           row.get("state_name"),
            "year":            row.get("year"),
            "chamber":         row.get("chamber_election_sub_leg"),
            "coalition_label": coalition_label,
            "classification":  "no_disagg_data",
            "n_parties":       0,
            "orig_seats":      orig_seats,
            "disagg_sum":      None,
            "seat_check_ok":   None,
        })
        continue

    row_class   = classify(coalition_label, parts)
    is_coal     = 1 if row_class in ("coalition_1", "coalition_n") else 0
    disagg_sum  = sum(s for _, s in parts)
    seat_ok     = (orig_seats is None) or (abs(disagg_sum - int(orig_seats)) == 0)

    report_rows.append({
        "state":           row.get("state_name"),
        "year":            row.get("year"),
        "chamber":         row.get("chamber_election_sub_leg"),
        "coalition_label": coalition_label,
        "classification":  row_class,
        "n_parties":       len(parts),
        "orig_seats":      orig_seats,
        "disagg_sum":      disagg_sum,
        "seat_check_ok":   seat_ok,
    })

    base = row.drop(labels=[DISAGG_COL]).to_dict()

    for party_name, party_seats in parts:
        new_row = base.copy()
        new_row["coalition_name"]  = coalition_label
        new_row["is_coalition"]    = is_coal
        new_row[PARTY_COL]         = party_name
        new_row[SEATS_COL]         = party_seats

        # Recompute perc_seats for this party
        if pd.notna(chamber_total) and chamber_total > 0:
            new_row[PERC_S_COL] = round(party_seats / chamber_total * 100, 4)
        else:
            new_row[PERC_S_COL] = None

        # Vote columns stay attached to all coalition member rows
        # (votes belong to the coalition, not individual parties)
        # is_coalition=1 makes this transparent downstream.

        new_row["seat_sum_mismatch"] = 0 if seat_ok else 1

        expanded_rows.append(new_row)

# ── Build output dataframe ────────────────────────────────────────────────────

# Column order: original cols (minus disagg) + new cols at the end
orig_cols_kept = [c for c in df.columns if c != DISAGG_COL]
new_cols       = ["coalition_name", "is_coalition", "seat_sum_mismatch"]
final_cols     = orig_cols_kept + new_cols

expanded_df = pd.DataFrame(expanded_rows, columns=final_cols)
expanded_df.reset_index(drop=True, inplace=True)

# ── Summary ───────────────────────────────────────────────────────────────────

report_df  = pd.DataFrame(report_rows)
class_counts = report_df["classification"].value_counts().to_dict()

print()
print("-- Expansion summary --")
print(f"  exact_match   (is_coalition=0) : {class_counts.get('exact_match', 0)}")
print(f"  abbreviation  (is_coalition=0) : {class_counts.get('abbreviation', 0)}")
print(f"  coalition_1   (is_coalition=1) : {class_counts.get('coalition_1', 0)}")
print(f"  coalition_n   (is_coalition=1) : {class_counts.get('coalition_n', 0)}")
print(f"  no_disagg_data                 : {class_counts.get('no_disagg_data', 0)}")
print()
print(f"  Original rows  : {len(df):,}")
print(f"  Expanded rows  : {len(expanded_df):,}  (+{len(expanded_df) - len(df)})")

seat_mismatches = report_df[report_df["seat_check_ok"] == False]
if len(seat_mismatches) > 0:
    print(f"\n  WARNING: {len(seat_mismatches)} seat-sum mismatches:")
    for _, m in seat_mismatches.iterrows():
        print(f"    {m['state']} {m['year']} {m['coalition_label']} "
              f"orig={m['orig_seats']} disagg_sum={m['disagg_sum']}")
else:
    print("  Seat-sum check : all OK (disagg always sums to original total)")

# ── Save ──────────────────────────────────────────────────────────────────────

expanded_df.to_excel(OUT / "SLED_mex_expanded.xlsx", index=False)
report_df.to_csv(OUT / "sled_mex_expansion_report.csv", index=False)

print()
print("Saved:")
print(f"  {OUT / 'SLED_mex_expanded.xlsx'}")
print(f"  {OUT / 'sled_mex_expansion_report.csv'}")
print()
print("Done.")
