# Office Staff Directory & Quarterly Training System

An internal employee directory web application for office administration, staff record management, and quarterly training report generation.

## Features
- **Clean Staff Directory**: Instant search across names, positions, divisions, and locations with sorting and responsive layout.
- **Physical Quick-Find**: Floor, desk, and room indicators next to staff names for locating colleagues in person.
- **Missing Data Flagging**: Icon-only alert indicators with hover tooltips highlighting incomplete positions or units.
- **Inline Editing**: Quick-fix missing positions and units directly within the table.
- **Spreadsheet Ingestion**: Excel (.xlsx, .xls) and CSV importer with auto-column mapping, smart name normalization (`LAST, First M.`), and duplicate resolution (merge vs keep separate).
- **Divisions & Groups**: Dedicated management sub-tabs to rename office divisions across all staff profiles or manage batches, committees, and teams.
- **Customizable Tabs & Columns**: Move and choose which tabs and columns to show with persistent local preferences.
- **Copy Formats**: Select staff records and copy as Plain List, Names + Positions, or Tab-Separated Tables (TSV) for direct paste into Word and Excel.
- **Exporting**: Filtered Excel and CSV export of staff records and quarterly training reports.
- **Training Records**: Automatic quarter derivation (`Q1 2026`), single and bulk enrollment per group, and summary training KPIs.
- **Audit Trail**: Chronological changelog tracking all modifications and actor details.
- **Theme Support**: Seamless Light and Dark mode with persistent theme preference.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Vite
- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), JWT Authentication, XLSX, PapaParse

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
# Starts both Express API and Vite dev server:
npm run dev

# Or run the unified production server:
npm run build
npm start
```
Open [http://localhost:4000](http://localhost:4000) (or [http://localhost:3000](http://localhost:3000) in dev mode).

### 3. Demo Credentials
- **Admin**: `admin` / `admin123`
- **Viewer**: `viewer` / `viewer123`

### 4. Database Reset
```bash
node server/reset_db.js
```
