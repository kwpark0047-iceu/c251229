# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seoul Subway Ad Sales System (서울 지하철 광고 영업 시스템) - a lead management application for subway advertising sales. Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS 4 with CSS variables for metro line colors
- **Auth**: Supabase Auth with organization-based multi-tenancy
- **External API**: LocalData.go.kr (Korean business license data)

### Key Directories
```
src/
├── app/
│   ├── lead-manager/       # Main application
│   │   ├── page.tsx        # Dashboard (leads + inventory tabs)
│   │   ├── types.ts        # All type definitions
│   │   ├── api.ts          # LocalData API integration
│   │   ├── supabase-service.ts   # Lead CRUD operations
│   │   ├── crm-service.ts        # CRM features (calls, proposals)
│   │   ├── inventory-service.ts  # Ad inventory management
│   │   ├── auth-service.ts       # Auth helpers
│   │   └── components/     # UI components
│   ├── auth/               # Auth pages
│   └── api/proxy/          # CORS proxy for LocalData API
├── lib/supabase/
│   ├── client.ts           # Browser Supabase client
│   └── server.ts           # Server-side Supabase client
```

### Database Schema
Schema is defined in `supabase-schema.sql`. Key tables:
- `leads` - Business leads with location, status, nearest station
- `ad_inventory` - Advertising inventory (station, type, price)
- `proposals` - Sales proposals linked to leads
- `call_logs` - CRM call tracking
- `sales_progress` - Sales pipeline stages
- `user_settings` - Per-user API settings

### Data Flow
1. User fetches data from LocalData.go.kr API (Korean business registry)
2. Coordinates converted from GRS80 (Korean TM) to WGS84 using proj4
3. Nearest subway station calculated for each lead
4. Data stored in Supabase with duplicate detection (biz_name + road_address)
5. Organization-based data isolation via RLS policies

### Business Categories
Seven categories with mapped LocalData service IDs:
- HEALTH (건강): Hospitals, clinics, pharmacies, opticians
- ANIMAL (동물): Vet clinics, pet stores, grooming
- FOOD (식품): Restaurants, food processing
- CULTURE (문화): Theaters, game rooms, karaoke
- LIVING (생활): Hotels, salons, gyms
- ENVIRONMENT (자원환경): Environmental facilities
- OTHER (기타)

### Lead Status Flow
`NEW` -> `PROPOSAL_SENT` -> `CONTACTED` -> `CONTRACTED`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Conventions

### Naming
- Korean comments throughout codebase
- DB columns: snake_case
- TypeScript: camelCase
- Type exports co-located in `types.ts`

### Styling
- CSS variables for metro line colors (`--metro-line1` through `--metro-line9`)
- Glass morphism effects using `glass-card` class
- Design theme: "Neo-Seoul Transit"

### API Handling
- CORS proxy at `/api/proxy` for LocalData API calls
- Multiple fallback CORS proxies configured
- 200ms delay between API calls to avoid rate limiting
