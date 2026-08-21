import type { NextRequest } from 'next/server'

// KORIC OpenAPI Station Gate Info endpoint
// https://openapi.kric.go.kr/openapi/convenientInfo/stationGateInfo

export interface StationGateInfoOutput {
  adr: string
  dst: string
  exitNo: string
  impFaclNm: string
  lnCd: string
  railOprIsttCd: string
  stinCd: string
  telNo: string
}

/**
 * Fetches station gate/ exit information from KORIC OpenAPI
 * 
 * Parameters:
 * - format: 'json' or 'xml' (default: 'json')
 * - lnCd: Line code (1-9 for subway lines)
 * - railOprIsttCd: Railroad operator station code  
 * - stinCd: Station code
 * - serviceKey: API key from environment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract parameters - use defaults if not provided
    const format = searchParams.get('format') || 'json'
    const lnCd = searchParams.get('lnCd') // Will query all if not specified
    const railOprIsttCd = searchParams.get('railOprIsttCd')
    const stinCd = searchParams.get('stinCd')
    const serviceKey = process.env.KORIC_API_KEY

    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: 'KORIC API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build API query - support all lines (1-9) or specific line
    // Per user requirement #2: query separately, not combined
    const apiBaseUrl = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationGateInfo'
    
    // User requirement #1: query all lines 1-9
    // User requirement #2: query separately, not combined
    // We'll make individual calls or handle the all-lines case
    
    // Construct the full API request
    const apiParams = new URLSearchParams({
      serviceKey,
      format,
    })

    // Add optional parameters if provided
    if (lnCd) apiParams.set('lnCd', lnCd)
    if (railOprIsttCd) apiParams.set('railOprIsttCd', railOprIsttCd)
    if (stinCd) apiParams.set('stinCd', stinCd)

    const apiUrl = `${apiBaseUrl}?${apiParams.toString()}`

    // Fetch from KORIC OpenAPI
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Seoul-Subway-Advertising/1.0'
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('KORIC API error:', response.status, errorData)
      return new Response(
        JSON.stringify({ 
          error: 'KORIC API request failed',
          details: response.statusText
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse response - handle both JSON and XML
    const rawData = await response.text()
    let data: any

    try {
      data = JSON.parse(rawData)
    } catch {
      // If not valid JSON, return raw text
      data = { raw: rawData }
    }

    // User requirement #4: Extract specific fields from output
    // Filter to only the fields we need
    const extractedData: StationGateInfoOutput = {
      adr: data.adr || '',
      dst: data.dst || '',
      exitNo: data.exitNo || '',
      impFaclNm: data.impFaclNm || '',
      lnCd: data.lnCd || '',
      railOprIsttCd: data.railOprIsttCd || '',
      stinCd: data.stinCd || '',
      telNo: data.telNo || '',
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData,
        source: 'KORIC OpenAPI stationGateInfo',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate'
        } 
      }
    )

  } catch (error) {
    console.error('Station gate info handler error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// POST handler for batch queries or more complex requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      lines,        // Array of line codes [1,2,3...] or 'all'
      format,       // 'json' or 'xml'
      railOprIsttCd,
      stinCd,
      serviceKey
    } = body

    // Use environment variable if not provided
    const key = serviceKey || process.env.KORIC_API_KEY

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'KORIC API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle line selection per user requirements
    let lineCodes: string[] = []
    
    if (lines === 'all' || !lines) {
      // User requirement #1: All lines 1-9
      lineCodes = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    } else if (Array.isArray(lines)) {
      lineCodes = lines
    } else {
      lineCodes = [lines]
    }

    // Per user requirement #2: Query separately, not combined
    // We'll process each line separately
    const results: any[] = []

    for (const lnCd of lineCodes) {
      const apiBaseUrl = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationGateInfo'
      const apiParams = new URLSearchParams({
        serviceKey: key,
        format: format || 'json',
        lnCd,
      })

      if (railOprIsttCd) apiParams.set('railOprIsttCd', railOprIsttCd)
      if (stinCd) apiParams.set('stinCd', stinCd)

      const apiUrl = `${apiBaseUrl}?${apiParams.toString()}`

      try {
        const lineResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Seoul-Subway-Advertising/1.0'
          },
        })

        if (lineResponse.ok) {
          const rawData = await lineResponse.text()
          let parsed: any
          
          try {
            parsed = JSON.parse(rawData)
          } catch {
            parsed = { raw: rawData }
          }

          // Extract specific fields per requirement #4
          const extracted: StationGateInfoOutput = {
            adr: parsed.adr || '',
            dst: parsed.dst || '',
            exitNo: parsed.exitNo || '',
            impFaclNm: parsed.impFaclNm || '',
            lnCd: parsed.lnCd || '',
            railOprIsttCd: parsed.railOprIsttCd || '',
            stinCd: parsed.stinCd || '',
            telNo: parsed.telNo || '',
          }

          results.push({
            line: lnCd,
            data: extracted,
            success: true
          })
        } else {
          results.push({
            line: lnCd,
            error: `API returned ${lineResponse.status}`,
            success: false
          })
        }
      } catch (fetchError) {
        results.push({
          line: lnCd,
          error: fetchError instanceof Error ? fetchError.message : 'Fetch error',
          success: false
        })
      }
      
      // Per requirement #2: Small delay between separate queries
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        totalLines: lineCodes.length,
        results,
        extractedPerRequirement: true,
        source: 'KORIC OpenAPI stationGateInfo batch query'
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate'
        } 
      }
    )

  } catch (error) {
    console.error('Station gate info batch handler error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const revalidate = 300 // ISR revalidation in seconds
export const dynamic = 'force-dynamic' // Always render dynamically
export const dynamicParams = true