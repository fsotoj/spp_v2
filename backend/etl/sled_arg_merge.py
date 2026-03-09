"""
sled_arg_merge.py
-----------------
Standalone script to enrich the SLED mother file with SLED_ARG data.
Run from the project root:
    python backend/etl/sled_arg_merge.py

Outputs (backend/etl/output/):
    phase1_name_map.csv          — full harmonization lookup + flags
    phase2_consistency.xlsx      — matched / ARG-only / SLED-only tables
    SLED_enriched.xlsx           — enriched SLED ready for review

Do NOT import into processor.py until this output is approved.
"""

import unicodedata
import re
from pathlib import Path
from collections import OrderedDict

import pandas as pd
import openpyxl  # noqa: F401 – ensures xlsx engine is available

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).resolve().parents[2]
RAW        = ROOT / "backend" / "data" / "raw"
OUT        = ROOT / "backend" / "etl" / "output"
OUT.mkdir(parents=True, exist_ok=True)

SLED_MOTHER_FILE    = RAW / "SLED (v.0.1).xlsx"
SLED_ARG_FILE       = RAW / "SLED_ARG.xlsx"
MATCH_BATCH1_FILE   = RAW / "match_results_approved.xlsx"
MATCH_BATCH2_FILE   = RAW / "match_results_V2_checked.xlsx"


# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    """
    Canonical string for comparison:
      - decode to NFC unicode
      - strip non-breaking spaces and other control chars
      - collapse whitespace
      - uppercase
    """
    if not isinstance(s, str):
        return ""
    s = unicodedata.normalize("NFC", s)
    s = s.replace("\xa0", " ").replace("\u200b", "")   # NBSP, zero-width space
    s = re.sub(r"\s+", " ", s).strip().upper()
    return s


def norm_series(col: pd.Series) -> pd.Series:
    return col.map(lambda x: normalize(x) if pd.notna(x) else "")


# ── Load data ─────────────────────────────────────────────────────────────────

print("Loading files...")

sled_mother = pd.read_excel(SLED_MOTHER_FILE)
sled_arg    = pd.read_excel(SLED_ARG_FILE)
batch1      = pd.read_excel(MATCH_BATCH1_FILE)
batch2      = pd.read_excel(MATCH_BATCH2_FILE)

print(f"  SLED mother : {len(sled_mother):,} rows")
print(f"  SLED_ARG    : {len(sled_arg):,} rows")
print(f"  Batch 1     : {len(batch1):,} rows  ({batch1['Approved'].sum()} approved)")
print(f"  Batch 2     : {len(batch2):,} rows  (all approved)")


# ── Phase 1: Name harmonization ───────────────────────────────────────────────
print("\n── Phase 1: Name harmonization ──")

# 1a. Unique party names in SLED mother, Argentina only
mother_arg = sled_mother[norm_series(sled_mother["country_name"]) == "ARGENTINA"]
mother_parties = set(norm_series(mother_arg["party_name_sub_leg"]).unique())
mother_parties.discard("")
print(f"  SLED mother ARG unique parties : {len(mother_parties)}")

# 1b. Unique party names in SLED_ARG
arg_parties = sorted(norm_series(sled_arg["party_name_sub_leg"]).unique())
arg_parties = [p for p in arg_parties if p]
print(f"  SLED_ARG unique parties        : {len(arg_parties)}")

# 1c. Build combined lookup from both batch files
#     batch1: Approved == True  →  New_Name → Closest_Old_Match
#     batch2: Approved in 1-5   →  New_Name → Option_{Approved}_Candidate

option_cols = {
    1: "Option_1_Candidate",
    2: "Option_2_Candidate",
    3: "Option_3_Candidate",
    4: "Option_4_Candidate",
    5: "Option_5_Candidate",
}

lookup: dict[str, str] = {}  # norm(New_Name) → norm(Correct_Match)

# Batch 1
b1_approved = batch1[batch1["Approved"] == True].copy()
for _, row in b1_approved.iterrows():
    key = normalize(str(row["New_Name"]))
    val = normalize(str(row["Closest_Old_Match"]))
    if key and val:
        lookup[key] = val

# Batch 2
for _, row in batch2.iterrows():
    approved_idx = row.get("Approved")
    if pd.isna(approved_idx) or approved_idx == 0:
        continue
    try:
        idx = int(approved_idx)
    except (ValueError, TypeError):
        continue
    col = option_cols.get(idx)
    if col is None:
        continue
    key = normalize(str(row["New_Name"]))
    val = normalize(str(row[col]))
    if key and val:
        lookup[key] = val

print(f"  Combined lookup entries        : {len(lookup)}")

# 1d. Resolve each SLED_ARG party name
records = []
for raw_name in sorted(set(norm_series(sled_arg["party_name_sub_leg"])) - {""}):
    if raw_name in mother_parties:
        records.append({
            "sled_arg_name":    raw_name,
            "harmonized_name":  raw_name,
            "source":           "direct_match",
        })
    elif raw_name in lookup:
        harmonized = lookup[raw_name]
        # sanity: is the resolved name actually in SLED mother?
        in_mother = harmonized in mother_parties
        records.append({
            "sled_arg_name":    raw_name,
            "harmonized_name":  harmonized,
            "source":           "batch_lookup",
            "resolved_in_mother": in_mother,
        })
    else:
        records.append({
            "sled_arg_name":    raw_name,
            "harmonized_name":  None,
            "source":           "UNRESOLVED",
        })

name_map_df = pd.DataFrame(records)

direct    = name_map_df[name_map_df["source"] == "direct_match"]
via_lookup = name_map_df[name_map_df["source"] == "batch_lookup"]
unresolved = name_map_df[name_map_df["source"] == "UNRESOLVED"]
not_in_mother = via_lookup[via_lookup.get("resolved_in_mother", pd.Series(True, index=via_lookup.index)) == False]

print(f"  Direct match                   : {len(direct)}")
print(f"  Resolved via lookup            : {len(via_lookup)}")
print(f"    └─ of which resolved name NOT in SLED mother : {len(not_in_mother)}")
print(f"  UNRESOLVED                     : {len(unresolved)}")

name_map_df.to_csv(OUT / "phase1_name_map.csv", index=False)
print(f"  → Saved phase1_name_map.csv")

if len(unresolved) > 0:
    print("\n  UNRESOLVED names (manual review needed):")
    for n in unresolved["sled_arg_name"].tolist():
        print(f"    · {n}")

if len(not_in_mother) > 0:
    print("\n  Lookup-resolved names not found in SLED mother (possible mismatch):")
    for _, r in not_in_mother.iterrows():
        print(f"    · {r['sled_arg_name']}  →  {r['harmonized_name']}")


# ── Apply harmonization to SLED_ARG ──────────────────────────────────────────

harm_map = dict(zip(name_map_df["sled_arg_name"], name_map_df["harmonized_name"]))
# norm → original raw string in mother (for writing back)
# We'll keep a case-preserving lookup from mother for the final output
mother_case = {normalize(p): p for p in mother_arg["party_name_sub_leg"].dropna().unique()}

sled_arg_h = sled_arg.copy()
sled_arg_h["party_name_sled_arg"] = norm_series(sled_arg_h["party_name_sub_leg"])  # normalized original
sled_arg_h["_norm_name"]          = norm_series(sled_arg_h["party_name_sub_leg"])
sled_arg_h["_harmonized_norm"]    = sled_arg_h["_norm_name"].map(harm_map)
# Restore mother's original casing where possible
sled_arg_h["party_name_sub_leg_harmonized"] = sled_arg_h["_harmonized_norm"].map(
    lambda n: mother_case.get(n, n) if pd.notna(n) else None
)


# ── Phase 2: Consistency check ────────────────────────────────────────────────
print("\n── Phase 2: Consistency check (election-year rows) ──")

# Election-year anchor rows: origin_year == year
sled_arg_elec = sled_arg_h[
    sled_arg_h["origin_year"].astype("Int64") == sled_arg_h["year"].astype("Int64")
].copy()

sled_arg_elec["_join_state"]   = norm_series(sled_arg_elec["state_name"])
sled_arg_elec["_join_year"]    = sled_arg_elec["year"].astype("Int64")
sled_arg_elec["_join_chamber"] = norm_series(sled_arg_elec["chamber_election_sub_leg"].astype(str))
sled_arg_elec["_join_party"]   = sled_arg_elec["_harmonized_norm"]

mother_arg_c = mother_arg.copy()
mother_arg_c["_join_state"]   = norm_series(mother_arg_c["state_name"])
mother_arg_c["_join_year"]    = pd.to_numeric(mother_arg_c["year"], errors="coerce").astype("Int64")
mother_arg_c["_join_chamber"] = norm_series(mother_arg_c["chamber_election_sub_leg"].astype(str))
mother_arg_c["_join_party"]   = norm_series(mother_arg_c["party_name_sub_leg"])

JOIN_KEYS = ["_join_state", "_join_year", "_join_chamber", "_join_party"]

# Indicator merge
merged = sled_arg_elec[JOIN_KEYS].drop_duplicates().merge(
    mother_arg_c[JOIN_KEYS].drop_duplicates(),
    on=JOIN_KEYS,
    how="outer",
    indicator=True,
)

matched    = merged[merged["_merge"] == "both"].copy()
arg_only   = merged[merged["_merge"] == "left_only"].copy()
mother_only = merged[merged["_merge"] == "right_only"].copy()

print(f"  Matched (both)       : {len(matched)}")
print(f"  ARG-only             : {len(arg_only)}")
print(f"  SLED mother-only     : {len(mother_only)}")

# Rename join cols for readability in report
def _clean_report(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "_join_state":   "state_name",
        "_join_year":    "year",
        "_join_chamber": "chamber",
        "_join_party":   "party_name_harmonized",
    }).drop(columns=["_merge"], errors="ignore").reset_index(drop=True)

with pd.ExcelWriter(OUT / "phase2_consistency.xlsx", engine="openpyxl") as writer:
    _clean_report(matched).to_excel(writer,     sheet_name="matched",     index=False)
    _clean_report(arg_only).to_excel(writer,    sheet_name="ARG_only",    index=False)
    _clean_report(mother_only).to_excel(writer, sheet_name="SLED_only",   index=False)

print("  → Saved phase2_consistency.xlsx")


# ── Phase 3: Build SLED_enriched ─────────────────────────────────────────────
print("\n── Phase 3: Build SLED_enriched ──")

#
# New columns (all nullable; NULL for non-ARG rows):
#   origin_year          int   — election year when seats were won
#   expire_year          int   — election year when seats expire
#   is_carryover         int   — 0 = current election seats; 1 = held from prior election
#   party_name_sled_arg  str   — original SLED_ARG canonical name (traceability)
#

NEW_COLS = ["origin_year", "expire_year", "is_carryover", "party_name_sled_arg"]

# ── Type A: Enrich existing SLED mother ARG election rows ────────────────────
# Match on (state, year, chamber, harmonized_party) to pull origin/expire from SLED_ARG

arg_tenure = sled_arg_h[[
    "_norm_name", "_harmonized_norm", "party_name_sled_arg",
    "origin_year", "expire_year", "year",
    "state_name", "chamber_election_sub_leg",
]].copy()
arg_tenure["_join_state"]   = norm_series(arg_tenure["state_name"])
arg_tenure["_join_year"]    = arg_tenure["year"].astype("Int64")
arg_tenure["_join_chamber"] = norm_series(arg_tenure["chamber_election_sub_leg"].astype(str))
arg_tenure["_join_party"]   = arg_tenure["_harmonized_norm"]

# Only election-year rows for enriching mother
arg_elec_tenure = arg_tenure[
    arg_tenure["origin_year"].astype("Int64") == arg_tenure["year"].astype("Int64")
][["_join_state", "_join_year", "_join_chamber", "_join_party",
   "origin_year", "expire_year", "party_name_sled_arg"]].drop_duplicates(
    subset=["_join_state", "_join_year", "_join_chamber", "_join_party"]
)

mother_enriched = sled_mother.copy()
for c in NEW_COLS:
    mother_enriched[c] = None

is_arg = norm_series(mother_enriched["country_name"]) == "ARGENTINA"
mother_enriched.loc[is_arg, "_join_state"]   = norm_series(mother_enriched.loc[is_arg, "state_name"])
mother_enriched.loc[is_arg, "_join_year"]    = pd.to_numeric(mother_enriched.loc[is_arg, "year"], errors="coerce").astype("Int64")
mother_enriched.loc[is_arg, "_join_chamber"] = norm_series(mother_enriched.loc[is_arg, "chamber_election_sub_leg"].astype(str))
mother_enriched.loc[is_arg, "_join_party"]   = norm_series(mother_enriched.loc[is_arg, "party_name_sub_leg"])

mother_arg_idx  = mother_enriched[is_arg].index
mother_arg_keys = mother_enriched.loc[mother_arg_idx, ["_join_state", "_join_year", "_join_chamber", "_join_party"]]

matched_tenure = mother_arg_keys.merge(
    arg_elec_tenure,
    on=["_join_state", "_join_year", "_join_chamber", "_join_party"],
    how="left",
)
matched_tenure.index = mother_arg_idx

mother_enriched.loc[mother_arg_idx, "origin_year"]         = matched_tenure["origin_year"].values
mother_enriched.loc[mother_arg_idx, "expire_year"]         = matched_tenure["expire_year"].values
mother_enriched.loc[mother_arg_idx, "is_carryover"]        = 0
mother_enriched.loc[mother_arg_idx, "party_name_sled_arg"] = matched_tenure["party_name_sled_arg"].values

# ── Fallback join: loosen party key for still-unmatched ARG rows ─────────────
# Covers two recurring SLED mother naming patterns that prevent exact joins:
#   1. "ALIANZA JUNTOS" in mother vs "JUNTOS" in SLED_ARG  (ALIANZA prefix)
#   2. "FRENTE ... UNIDAD" vs "FRENTE ... - UNIDAD"        (hyphen before last word)
# Strategy: strip "ALIANZA " prefix and normalize hyphens on BOTH sides, retry.

def loosen_party_key(s: pd.Series) -> pd.Series:
    """Strip ALIANZA prefix, normalize hyphens → spaces, collapse whitespace."""
    return (
        s.str.replace(r"^ALIANZA\s+", "", regex=True)
         .str.replace(r"\s*-\s*", " ", regex=True)
         .str.replace(r"\s{2,}", " ", regex=True)
         .str.strip()
    )

unmatched_idx = mother_enriched.loc[mother_arg_idx][
    mother_enriched.loc[mother_arg_idx, "expire_year"].isna()
].index

if len(unmatched_idx) > 0:
    # Build loose keys for unmatched mother rows
    loose_mother = mother_enriched.loc[unmatched_idx,
        ["_join_state", "_join_year", "_join_chamber", "_join_party"]].copy()
    loose_mother["_join_party"] = loosen_party_key(loose_mother["_join_party"])

    # Build loose keys for SLED_ARG side
    arg_elec_loose = arg_elec_tenure.copy()
    arg_elec_loose["_join_party"] = loosen_party_key(arg_elec_loose["_join_party"])
    arg_elec_loose = arg_elec_loose.drop_duplicates(
        subset=["_join_state", "_join_year", "_join_chamber", "_join_party"]
    )

    fallback = loose_mother.merge(
        arg_elec_loose,
        on=["_join_state", "_join_year", "_join_chamber", "_join_party"],
        how="left",
    )
    fallback.index = unmatched_idx

    newly_matched = fallback["expire_year"].notna().sum()
    mother_enriched.loc[unmatched_idx, "origin_year"]         = fallback["origin_year"].values
    mother_enriched.loc[unmatched_idx, "expire_year"]         = fallback["expire_year"].values
    mother_enriched.loc[unmatched_idx, "is_carryover"]        = 0
    mother_enriched.loc[unmatched_idx, "party_name_sled_arg"] = fallback["party_name_sled_arg"].values
    print(f"  Type A — Fallback join newly matched  : {newly_matched}")

# Drop join helper cols
mother_enriched.drop(columns=["_join_state", "_join_year", "_join_chamber", "_join_party"],
                     errors="ignore", inplace=True)

# How many ARG rows got tenure info?
arg_enriched = mother_enriched[is_arg]
got_tenure = arg_enriched["expire_year"].notna().sum()
no_tenure  = arg_enriched["expire_year"].isna().sum()
print(f"  Type A — SLED mother ARG rows enriched : {got_tenure}")
print(f"  Type A — SLED mother ARG rows unmatched: {no_tenure}  (no SLED_ARG counterpart)")

# ── Type B: Carryover rows ────────────────────────────────────────────────────
# For each SLED_ARG tenure window, generate one row per year in
# (origin_year < year < expire_year).
#
# NOTE: carryover rows ARE generated even for years that are election years for
# the same state+chamber.  ARG has staggered bicameral renewal — half the seats
# renew each cycle, so in an election year a chamber contains BOTH:
#   • newly elected seats  (Type A, is_carryover=0)
#   • seats carried from the prior cycle  (Type B, is_carryover=1)
# The processor aggregates duplicate (state, year, chamber, party) keys by
# summing seats, which is correct when the same party holds seats from two
# overlapping tenure windows.

# Mother columns — we'll produce NaN for everything except what SLED_ARG provides
mother_cols = [c for c in mother_enriched.columns if c not in NEW_COLS]

carryover_rows = []

for _, tenure in sled_arg_h.iterrows():
    origin  = tenure["origin_year"]
    expire  = tenure["expire_year"]
    seats   = tenure["seats"]
    state   = tenure["state_name"]
    chamber = str(tenure["chamber_election_sub_leg"])
    party_h = tenure["party_name_sub_leg_harmonized"]
    party_o = tenure["party_name_sled_arg"]   # original canonical ARG name

    if pd.isna(origin) or pd.isna(expire):
        continue
    origin, expire = int(origin), int(expire)

    # All years strictly between origin and expire
    for yr in range(origin + 1, expire):
        state_norm   = normalize(state)
        chamber_norm = normalize(chamber)

        row: dict = {c: None for c in mother_cols}
        row["country_name"]               = "ARGENTINA"
        row["country_code"]               = "032"
        row["state_name"]                 = state
        row["year"]                       = yr
        row["chamber_election_sub_leg"]   = chamber
        row["party_name_sub_leg"]         = party_h if pd.notna(party_h) else party_o
        row["total_seats_party_sub_leg"]  = int(seats) if pd.notna(seats) else None
        # Carry forward country_state_code, state_code, region_name from mother if available
        ref = mother_arg[norm_series(mother_arg["state_name"]) == state_norm]
        if not ref.empty:
            for fc in ["state_code", "country_state_code", "region_name"]:
                if fc in ref.columns:
                    row[fc] = ref.iloc[0][fc]
        # New columns
        row["origin_year"]         = origin
        row["expire_year"]         = expire
        row["is_carryover"]        = 1
        row["party_name_sled_arg"] = party_o
        carryover_rows.append(row)

carryover_df = pd.DataFrame(carryover_rows, columns=list(mother_enriched.columns))
print(f"  Type B — Carryover rows generated      : {len(carryover_df)}")

# ── Combine ───────────────────────────────────────────────────────────────────
sled_enriched = pd.concat([mother_enriched, carryover_df], ignore_index=True)
sled_enriched.sort_values(
    ["country_name", "state_name", "chamber_election_sub_leg", "year", "party_name_sub_leg"],
    na_position="last",
    inplace=True,
)
sled_enriched.reset_index(drop=True, inplace=True)

print(f"\n  Original SLED mother rows : {len(mother_enriched):,}")
print(f"  Carryover rows added      : {len(carryover_df):,}")
print(f"  Total enriched rows       : {len(sled_enriched):,}")

# ── Final: resolve party_name_sub_leg to canonical name ──────────────────────
# For every row that was matched to SLED_ARG, party_name_sled_arg holds the
# clean canonical name. That becomes the new party_name_sub_leg so that the
# rest of the pipeline has exactly one name column to key on.
#
# The original messy SLED mother name is archived in legacy_party_name_sub_leg
# for traceability. BRA rows and unmatched ARG rows are left unchanged.
legacy_col_idx = sled_enriched.columns.get_loc("party_name_sub_leg") + 1
sled_enriched.insert(legacy_col_idx, "legacy_party_name_sub_leg",
                     sled_enriched["party_name_sub_leg"])

has_canonical = sled_enriched["party_name_sled_arg"].notna()
sled_enriched.loc[has_canonical, "party_name_sub_leg"] = (
    sled_enriched.loc[has_canonical, "party_name_sled_arg"]
)

resolved = has_canonical.sum()
print(f"  Name resolution — canonical name applied : {resolved} rows")
print(f"  Name resolution — unchanged (BRA/unmatched ARG) : {(~has_canonical).sum()} rows")

sled_enriched.to_excel(OUT / "SLED_enriched.xlsx", index=False)
print(f"  → Saved SLED_enriched.xlsx")

print("\nDone.")
