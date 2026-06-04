// Recalculate nearest station distances for all leads
import { createClient } from '@supabase/supabase-js';

// Inline implementation of findNearestStation (simplified without address weighting)
import { SUBWAY_STATIONS } from '../src/app/lead-manager/constants';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestStation(lat: number, lng: number, address?: string) {
  let bestMatch: { station: any; distance: number; score: number } | null = null;
  for (const station of SUBWAY_STATIONS) {
    if (!station.lat || !station.lng) continue;
    const physicalDistance = calculateDistance(lat, lng, station.lat, station.lng);
    if (physicalDistance > 3000) continue;
    const weightedDistance = physicalDistance; // no address weighting
    if (!bestMatch || weightedDistance < bestMatch.score) {
      bestMatch = { station, distance: physicalDistance, score: weightedDistance };
    }
  }
  return bestMatch ? { station: bestMatch.station, distance: bestMatch.distance } : null;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars missing');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, latitude, longitude')
    .neq('latitude', null)
    .neq('longitude', null);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  if (!leads) {
    console.log('No leads to process');
    return;
  }

  for (const lead of leads as any[]) {
    const { id, latitude, longitude } = lead;
    if (latitude == null || longitude == null) continue;
    const nearest = findNearestStation(latitude, longitude);
    if (nearest && nearest.distance != null) {
      const distance = Math.round(nearest.distance);
      const { error: updateError } = await supabase
        .from('leads')
        .update({ station_distance: distance })
        .eq('id', id);
      if (updateError) {
        console.error(`Failed to update lead ${id}:`, updateError);
      } else {
        console.log(`Lead ${id} updated with distance ${distance}m`);
      }
    }
  }
}

main().catch((e) => console.error('Unexpected error:', e));
