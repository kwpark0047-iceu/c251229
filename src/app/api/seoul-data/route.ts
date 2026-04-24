import { NextRequest, NextResponse } from 'next/server';
import { 
  getSeoulClinicLicenseData, 
  getSeoulHospitalLicenseData,
  getSeoulQuasiMedicalLicenseData,
  getSeoulFitnessLicenseData,
  getRealtimeArrival,
  getSeoulStationsByLine
} from '@/lib/seoul-data-api';

/**
 * 서울 열린데이터 광장 API 프록시
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const service = searchParams.get('service');
  const startIndex = parseInt(searchParams.get('start') || '1');
  const endIndex = parseInt(searchParams.get('end') || '100');
  const query = searchParams.get('query') || '';

  if (!service) {
    return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 });
  }

  try {
    let result: any = null;

    switch (service) {
      case 'clinic':
        result = await getSeoulClinicLicenseData(startIndex, endIndex);
        break;
      case 'hospital':
        result = await getSeoulHospitalLicenseData(startIndex, endIndex);
        break;
      case 'quasi-medical':
        result = await getSeoulQuasiMedicalLicenseData(startIndex, endIndex);
        break;
      case 'fitness':
        result = await getSeoulFitnessLicenseData(startIndex, endIndex);
        break;
      case 'arrival':
        if (!query) return NextResponse.json({ success: false, error: 'Station name is required' }, { status: 400 });
        const arrivals = await getRealtimeArrival(query);
        result = { success: true, data: arrivals };
        break;
      case 'stations':
        if (!query) return NextResponse.json({ success: false, error: 'Line name is required' }, { status: 400 });
        const stations = await getSeoulStationsByLine(query);
        result = { success: true, data: stations };
        break;
      default:
        return NextResponse.json({ success: false, error: 'Unsupported service' }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ success: false, error: 'Failed to fetch data from Seoul API' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('[Seoul Data API Route] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
