# API Key Configuration Guide

## Required Environment Variables for Station-Info API

The following environment variables are required for the `/api/station-info` endpoint to function properly:

| Variable | Priority | Description |
|----------|----------|-------------|
| `DATAGOKR_API_KEY` | 1st | LocalData.go.kr API key for business license data |
| `KRIC_API_KEY` | 2nd | KRIC historical facility information API key |
| `NEXT_PUBLIC_KRIC_API_KEY` | 3rd | Client-side KRIC API key (Next.js App Router) |
| `STATION_INFO_API_KEY` | 4th | Station info API key (fallback) |

## Key Priority Chain

When no API keys are configured, the `/api/station-info` route returns HTTP 500. The key resolution order is:

```
DATAGOKR_API_KEY → KRIC_API_KEY → NEXT_PUBLIC_KRIC_API_KEY → STATION_INFO_API_KEY
```

## Configuration Requirements

### 1. Vercel Environment Variables

Add the above variables to your Vercel project settings:

```
DATAGOKR_API_KEY=your_localdata_key
KRIC_API_KEY=your_kric_key
NEXT_PUBLIC_KRIC_API_KEY=your_public_kric_key
STATION_INFO_API_KEY=your_station_info_key
```

### 2. Next.js `.env.local` (Development Only)

```
DATAGOKR_API_KEY=your_localdata_key
KRIC_API_KEY=your_kric_key
NEXT_PUBLIC_KRIC_API_KEY=your_public_kric_key
STATION_INFO_API_KEY=your_station_info_key
```

**Note:** `.env.local` must NOT be committed or exposed in production. Use Vercel's environment variable settings for production deployments.

### 3. API Key Validation

Run verification curl command:

```bash
curl -X POST http://localhost:3000/api/station-info \
  -H "Content-Type: application/json" \
  -d '{"keyword": "테스트"}'
```

Expected: HTTP 200 with valid JSON when at least one API key is configured.

## Troubleshooting

### HTTP 500 Error

If `/api/station-info` returns HTTP 500:

1. Check that at least one API key is configured in Vercel environment variables
2. Verify the key priority chain - the first available key in the chain will be used
3. Ensure the key has proper permissions for the respective API service

### Missing Key Warning

If no keys are configured, the API returns an error with guidance on which keys are needed.

## Security Notes

- Never expose `.env.local` in public repositories
- Use Vercel's secure environment variable storage for production
- Rotate keys regularly according to each API's security policy
- `NEXT_PUBLIC_` prefix means the variable will be exposed to the browser - only use for non-sensitive data