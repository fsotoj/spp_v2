# Subnational Politics Project (SPP) V2 - Knowledge Handoff

## 1. Context & Background
This project represents a complete modernization of the **Subnational Politics Project (SPP)** dashboard. The original system was built using R and Shiny, which served the project well but reached its limits in terms of responsiveness, code maintainability, and data scaling.

- **Legacy Project Path**: `c:\Users\pipei\OneDrive\Escritorio\subn_v3\spp-hf` (R/Shiny codebase)
- **V2 Project Path**: `backend/` (FastAPI + SQLModel)
- **Database**: `data/db/spp_dev.db` (SQLite for dev, move to Postgres for production).
- **Data Architecture**: Entity-Attribute-Value (EAV) model for flexibility without hardcoding columns.
- **Frontend**: React (Vite + TypeScript + Tailwind CSS).
- **Map Engine**: Leaflet (via React-Leaflet) with optimized GeoJSON rendering.
- **State Management**: TanStack Query (React Query) for efficient data caching.

## 3. Key Achievements & Implemented Features

### � Storytelling & Portal Refinement
- **Storytelling Landing Page**: Migrated `SppAbout.js` legacy content into a high-impact storytelling root page.
    - **Hero Section**: Restored original "Explore Subnational Latin American Politics" identity.
    - **Feature Grid**: Implemented the project's three pillars (Comparability, Depth, Records) with bespoke icons.
    - **Browser Frame Demo**: Interactive-style mockup showcasing the dashboard for immediate user engagement.
- **Advanced Navigation Spine**:
    - **Collapsible "Explore" Menu**: Replaced multiple links with a single, context-aware dropdown.
    - **Dynamic Labeling**: The header button updates to show the active tool (e.g., "Explore: Mapping Tool").
    - **Simplified Branding**: Removed redundant text to let the SPP logo serve as the primary home anchor.
- **Designer Recognition**: Updated footer with credit to **Felipe Soto Jorquera** and relevant LinkedIn linkage.

### 🛠 Architecture Optimizations
- **API Pivot Engine**: A dynamic EAV-to-Wide pivot logic in Python that supports multi-dataset requests in a single round-trip.
- **Build Optimization**: Configured Vite manual chunking to split code into specialized bundles (`vendor-react`, `vendor-leaflet`, `vendor-ui`), keeping the app snappy.

## 4. Current Configuration (Defaults)
- **Focus Country**: Mexico (Selected and Zoomed by default).
- **Variable**: Voter Turnout % (`perc_voter_sub_exe`).
- **Year**: 2015.
- **UI**: Sidebars start collapsed for a clean "map-first" experience.

## 5. What Comes Next (The Roadmap)

### Functionality
- **Graphing Module**: Re-implement the line plot module using the same V2 EAV data source.
- **Chamber Tool (Hemicycle)**: Implement the legislative chamber visualization for selected states.
- **Methodology & Data Portal**: Populate the structural content for the new portal pages.

### Polish
- **Dark Mode Support**: The dashboard is styled with variables ready for a dark theme implementation.
- **Interactive Tooltips**: Add mini-tooltips on hover before the user clicks to open the full popup.

---
---

## 6. Research Portal Evolution (V2)
The project has evolved from a standalone dashboard into a full **Research Portal** architecture:
- **Landing Page (`/`)**: A storytelling entry point focusing on mission and impact.
- **Data Explorer (`/explore`)**: The interactive Map Module embedded within a professional analytical sidebar.
- **Advanced Navigation**: A centralized "Explore" hub for all current and future analytical tools.
- **Branding**: Native integration of the SPP Magenta/Purple/Orange identity, strictly adhering to original title and naming conventions (no AI placeholders).

*Created by Antigravity - March 2026*
