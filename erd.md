# SPP V2 – Relational Schema (EAV Architecture)

## Entity-Relationship Diagram

```mermaid
erDiagram
    dim_country {
        int id PK
        string name UK
        string code
        float bbox_lng1
        float bbox_lat1
        float bbox_lng2
        float bbox_lat2
    }

    dim_state {
        int id PK
        int country_id FK
        string name
        string code
        string country_state_code UK
        string region_name
        text geom_json
        string name_geom
    }

    dim_variable_dictionary {
        int id PK
        string variable UK
        string pretty_name
        string category
        string dataset
        string type
        string palette
        int viewable_map
        int viewable_graph
        string scope
        text description_for_ui
    }

    fact_observation {
        int id PK
        int state_id FK "NULL for national"
        int country_id FK "NULL for subnational"
        int year
        int variable_id FK
        float value_numeric
        string value_text
        string dataset "NED SED SEED SDI"
    }

    dim_party_color_exe {
        int id PK
        string country_name
        string party_name
        float importance
        string color
    }

    dim_party_color_leg {
        int id PK
        string country_name
        string party_name
        float importance
        string color
    }

    fact_sled_raw {
        int id PK
        int state_id FK
        int year
        string chamber_election_sub_leg
        string party_name_sub_leg
        int total_seats_party_sub_leg
    }

    fact_sled_snapshot {
        int id PK
        int state_id FK
        string country_state_code
        int year
        string chamber_sub_leg
    }

    fact_sled_arg {
        int id PK
        int state_id FK
        int year
        string party_name_sub_leg
        int seats
    }

    etl_validation_log {
        int id PK
        string level
        string category
        string message
        string source_file
        string variable_or_party
        string created_at
    }

    dim_country ||--o{ dim_state : "has"
    dim_country ||--o{ fact_observation : "national obs"
    dim_state ||--o{ fact_observation : "subnational obs"
    dim_variable_dictionary ||--o{ fact_observation : "defines"
    dim_state ||--o{ fact_sled_raw : "has"
    dim_state ||--o{ fact_sled_snapshot : "has"
    dim_state ||--o{ fact_sled_arg : "has"
```

## Data Flow

```mermaid
flowchart LR
    subgraph Sources["Excel Sources"]
        DICT["dict_new.xlsx"]
        NED["NED.xlsx"]
        SED["SED.xlsx"]
        SEED["SEED.xlsx"]
        SDI["SDI.xlsx"]
        SLED["SLED + MEX"]
        ARG["SLED_ARG.xlsx"]
        PC["party_colors*.xlsx"]
    end

    subgraph ETL["core/processor.py"]
        DISC["Variable Discovery<br/>dict first → cross-ref"]
        EAV["EAV Insert<br/>column → Observation row"]
        VALIDATE["Party Validation<br/>name ↔ color check"]
        PIVOT["SLED Pipeline<br/>bind → pivot → fill"]
    end

    subgraph DB["SQLite / PostgreSQL"]
        DIM[("Dimensions")]
        OBS[("fact_observation<br/>~123K rows")]
        SLED_T[("SLED tables")]
        LOG[("etl_validation_log")]
    end

    DICT --> DISC --> DIM
    NED & SED & SEED & SDI --> EAV --> OBS
    DISC --> EAV
    PC --> DIM
    SED --> VALIDATE --> LOG
    SLED --> PIVOT --> SLED_T
    ARG --> SLED_T
```

## Table Summary

| Table | Type | Rows | Notes |
|---|---|---|---|
| `dim_variable_dictionary` | Dimension | 96 | 87 from dict + 9 auto-registered |
| `dim_country` | Dimension | 3 | With bboxes |
| `dim_state` | Dimension | 83 | With GeoJSON |
| `dim_party_color_exe` | Dimension | 85 | Exe styling |
| `dim_party_color_leg` | Dimension | 940 | Leg styling |
| `fact_observation` | Fact (EAV) | 122,739 | NED+SED+SEED+SDI |
| `fact_sled_raw` | Fact (wide) | 14,748 | Party-level grain |
| `fact_sled_snapshot` | Fact (wide) | 2,853 | Pivoted+filled |
| `fact_sled_arg` | Fact (wide) | 1,687 | Argentina tenure |
| `etl_validation_log` | Audit | 10 | Warnings logged |
