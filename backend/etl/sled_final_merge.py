"""
sled_final_merge.py
-------------------
Merges the three processed SLED sources into a single unified file:

  SLED_enriched.xlsx      → ARGENTINA (election rows + ARG carryover) + BRAZIL
  SLED_mex_expanded.xlsx  → MEXICO (party-level, coalition-expanded)

New columns introduced by each pipeline are set to NULL for the other countries:
  ARG-specific : origin_year, expire_year, is_carryover, party_name_sled_arg
  MEX-specific : coalition_name, is_coalition, seat_sum_mismatch

Run from project root:
    python backend/etl/sled_final_merge.py

Output → backend/etl/output/
    SLED_unified.xlsx    single file ready for ETL integration review
"""

from pathlib import Path
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parents[2]
OUT  = ROOT / "backend" / "etl" / "output"

ENRICHED_FILE   = OUT / "SLED_enriched.xlsx"
MEX_EXP_FILE    = OUT / "SLED_mex_expanded.xlsx"

# ── Load ──────────────────────────────────────────────────────────────────────

print("Loading processed files...")
enriched = pd.read_excel(ENRICHED_FILE)
mex_exp  = pd.read_excel(MEX_EXP_FILE)

print(f"  SLED_enriched  : {len(enriched):>6,} rows  {enriched['country_name'].value_counts().to_dict()}")
print(f"  SLED_mex_expanded: {len(mex_exp):>6,} rows  {mex_exp['country_name'].value_counts().to_dict()}")

# ── Align columns — fill missing with None ────────────────────────────────────

all_cols = list(enriched.columns) + [c for c in mex_exp.columns if c not in enriched.columns]

for col in all_cols:
    if col not in enriched.columns:
        enriched[col] = None
    if col not in mex_exp.columns:
        mex_exp[col] = None

enriched = enriched[all_cols]
mex_exp  = mex_exp[all_cols]

# ── Concatenate ───────────────────────────────────────────────────────────────

unified = pd.concat([enriched, mex_exp], ignore_index=True)

unified.sort_values(
    ["country_name", "state_name", "chamber_election_sub_leg", "year", "party_name_sub_leg"],
    na_position="last",
    inplace=True,
)
unified.reset_index(drop=True, inplace=True)

# ── Summary ───────────────────────────────────────────────────────────────────

print()
print("-- Unified SLED summary --")
for country, grp in unified.groupby("country_name", sort=True):
    carryover   = int(grp.get("is_carryover",   pd.Series(0)).fillna(0).sum())
    coalition   = int(grp.get("is_coalition",   pd.Series(0)).fillna(0).sum())
    mismatch    = int(grp.get("seat_sum_mismatch", pd.Series(0)).fillna(0).sum())
    flags = []
    if carryover:  flags.append(f"carryover={carryover}")
    if coalition:  flags.append(f"coalition={coalition}")
    if mismatch:   flags.append(f"seat_mismatch={mismatch}")
    flag_str = f"  [{', '.join(flags)}]" if flags else ""
    print(f"  {country:<12} {len(grp):>6,} rows{flag_str}")

print(f"  {'TOTAL':<12} {len(unified):>6,} rows")
print(f"  Columns        : {len(unified.columns)}")

# ── Save ──────────────────────────────────────────────────────────────────────

out_path = OUT / "SLED_unified.xlsx"
unified.to_excel(out_path, index=False)
print(f"\nSaved: {out_path}")

# Also write directly to data/raw so the ETL can pick it up without manual copy
raw_path = ROOT / "backend" / "data" / "raw" / "SLED_unified.xlsx"
unified.to_excel(raw_path, index=False)
print(f"Saved: {raw_path}")
print("Done.")
