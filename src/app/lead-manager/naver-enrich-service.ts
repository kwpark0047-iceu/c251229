import axios from 'axios';

/**
 * Naver Map Enrichment Service
 * Fetches additional business details (website, blog, phone, email) using Naver Search API.
 * This implementation uses Naver Search (Open API) as a lightweight way to obtain public info.
 * For production, replace with official Naver Maps Business API if available.
 */
export interface BusinessEnrichment {
  website?: string;
  blog?: string;
  phone?: string;
  email?: string;
}

/**
 * Retrieves enrichment data for a given business.
 * @param name Business name (e.g., clinic or hospital name)
 * @param apiKey Naver Open API client ID (X-Naver-Client-Id)
 * @param apiSecret Naver Open API client secret (X-Naver-Client-Secret)
 */
export async function enrichBusiness(name: string, apiKey: string, apiSecret: string): Promise<BusinessEnrichment> {
  const url = 'https://openapi.naver.com/v1/search/local.json';
  try {
    const { data } = await axios.get(url, {
      params: { query: name, display: 5 },
      headers: {
        'X-Naver-Client-Id': apiKey,
        'X-Naver-Client-Secret': apiSecret,
      },
    });
    const first = data.items?.[0];
    if (!first) return {};
    const enrichment: BusinessEnrichment = {
      phone: first.tel,
    };
    if (first.link) {
      enrichment.website = first.link;
    }
    // Blog and email are not directly provided by Naver Local API; left undefined.
    return enrichment;
  } catch (err) {
    console.error('Naver enrichment error:', err);
    return {};
  }
}
