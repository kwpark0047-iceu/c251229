/**
 * KORIC OpenAPI Station Gate Info Service
 * 
 * Provides station exit/outage information from KORIC OpenAPI
 * https://openapi.kric.go.kr/openapi/convenientInfo/stationGateInfo
 * 
 * Purpose: 지도표시, 인근역매칭, 출구확인 고도화 구현
 * 
 * API Specification:
 * - Endpoint: /openapi/convenientInfo/stationGateInfo
 * - Parameters: serviceKey, format, lnCd, railOprIsttCd, stinCd
 * - Output: adr, dst, exitNo, impFaclNm, lnCd, railOprIsttCd, stinCd, telNo
 * 
 * Integration Requirements (confirmed by user):
 * 1) All lines (1-9) - Query all subway lines
 * 2) Separately (not combined) - Individual API calls per line
 * 3) Backend API route - /api/station-gate-info
 * 4) Extract specific fields - Filter to needed output variables
 */

import type { StationGateInfoOutput } from '@/app/api/station-gate-info/route'

/**
 * Station gate info service class
 */
export class StationGateInfoService {
  private serviceKey: string
  private baseUrl: string

  constructor() {
    // KORIC API key from environment variables
    this.serviceKey = process.env.KORIC_API_KEY || ''
    this.baseUrl = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationGateInfo'
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.serviceKey && this.serviceKey.length > 0
  }

  /**
   * Fetch station gate information for a specific line
   * 
   * Per requirement #2: Query separately, not combined with other lines
   * 
   * @param lnCd Line code (1-9). Use 'all' or undefined for all lines
   * @param railOprIsttCd Railroad operator station code (optional)
   * @param stinCd Station code (optional)
   * @param format Response format ('json' or 'xml', default: 'json')
   * @returns Station gate info data or null if error
   */
  async fetchByLine(
    lnCd: string | 'all' = 'all',
    railOprIsttCd?: string,
    stinCd?: string,
    format: 'json' | 'xml' = 'json'
  ): Promise<StationGateInfoOutput | null> {
    // Per requirement #1: If 'all', we'll handle at a higher level
    // For single line query
    const apiParams = new URLSearchParams({
      serviceKey: this.serviceKey,
      format,
      lnCd,
    })

    if (railOprIsttCd) apiParams.set('railOprIsttCd', railOprIsttCd)
    if (stinCd) apiParams.set('stinCd', stinCd)

    const apiUrl = `${this.baseUrl}?${apiParams.toString()}`

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Seoul-Subway-Advertising/1.0',
        },
      })

      if (!response.ok) {
        console.error(`KORIC API error for line ${lnCd}:`, response.status)
        return null
      }

      const rawData = await response.text()
      let data: any

      try {
        data = JSON.parse(rawData)
      } catch {
        // If not valid JSON, try to extract what we can
        data = { raw: rawData }
      }

      // Per requirement #4: Extract specific fields from output
      return {
        adr: data.adr || '',
        dst: data.dst || '',
        exitNo: data.exitNo || '',
        impFaclNm: data.impFaclNm || '',
        lnCd: data.lnCd || '',
        railOprIsttCd: data.railOprIsttCd || '',
        stinCd: data.stinCd || '',
        telNo: data.telNo || '',
      } as StationGateInfoOutput

    } catch (error) {
      console.error(`Failed to fetch station gate info for line ${lnCd}:`, error)
      return null
    }
  }

  /**
   * Fetch station gate information for all lines (1-9)
   * 
   * Per requirement #1: Query all lines
   * Per requirement #2: Query separately (each line individually)
   * 
   * @param railOprIsttCd Railroad operator station code (optional)
   * @param stinCd Station code (optional)
   * @param format Response format ('json' or 'xml', default: 'json')
   * @returns Array of results for all 9 lines
   */
  async fetchAllLines(
    railOprIsttCd?: string,
    stinCd?: string,
    format: 'json' | 'xml' = 'json'
  ): Promise<Array<{ line: string; data: StationGateInfoOutput; success: boolean }>> {
    const lineCodes = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    const results: Array<{ line: string; data: StationGateInfoOutput; success: boolean }> = []

    for (const lnCd of lineCodes) {
      // Per requirement #2: Query separately, not combined
      const data = await this.fetchByLine(lnCd, railOprIsttCd, stinCd, format)

      results.push({
        line: lnCd,
        data: data || {
          adr: '',
          dst: '',
          exitNo: '',
          impFaclNm: '',
          lnCd: lnCd,
          railOprIsttCd: railOprIsttCd || '',
          stinCd: stinCd || '',
          telNo: '',
        },
        success: data !== null,
      })

      // Small delay between separate queries (politeness + rate limiting)
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return results
  }

  /**
   * Fetch station gate information with specific filters
   * 
   * @param lnCd Line code (specific or 'all')
   * @param railOprIsttCd Railroad operator station code
   * @param stinCd Station code
   * @returns Filtered station gate info or null
   */
  async fetchWithFilters(
    lnCd: string,
    railOprIsttCd: string,
    stinCd: string
  ): Promise<StationGateInfoOutput | null> {
    return this.fetchByLine(lnCd, railOprIsttCd, stinCd)
  }

  /**
   * Get a single station's exit info by station code
   * 
   * @param stinCd Station code (e.g., '131012' for specific station)
   * @param lnCd Line code (optional, defaults to all)
   * @returns Station gate info or null
   */
  async fetchByStationCode(
    stinCd: string,
    lnCd: string = 'all'
  ): Promise<StationGateInfoOutput | null> {
    return this.fetchByLine(lnCd, undefined, stinCd)
  }
}

/**
 * Export a singleton instance for easy import
 */
export const stationGateInfoService = new StationGateInfoService()

/**
 * Type guard to check if data is valid StationGateInfoOutput
 */
export function isStationGateInfoOutput(
  data: any
): data is StationGateInfoOutput {
  return (
    data &&
    typeof data.adr === 'string' &&
    typeof data.dst === 'string' &&
    typeof data.exitNo === 'string' &&
    typeof data.impFaclNm === 'string' &&
    typeof data.lnCd === 'string' &&
    typeof data.railOprIsttCd === 'string' &&
    typeof data.stinCd === 'string' &&
    typeof data.telNo === 'string'
  )
}

/**
 * Default export for backwards compatibility
 */
export default stationGateInfoService