import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDistances() {
  console.log("Fetching recent raw complaints with locations...")
  const { data: complaints, error } = await supabase
    .from('raw_complaints')
    .select('id, title, location, address_line_1, city')
    .limit(10)

  if (error) {
    console.error("Error fetching complaints:", error)
    return
  }

  console.log(`Found ${complaints.length} complaints.`)

  for (let i = 0; i < complaints.length; i++) {
    for (let j = i + 1; j < complaints.length; j++) {
      const c1 = complaints[i]
      const c2 = complaints[j]

      if (c1.location && c2.location) {
        // Query PostGIS directly for distance
        const { data: distData, error: distError } = await supabase.rpc('get_distance_between', {
          p_id1: c1.id,
          p_id2: c2.id
        })

        if (distError) {
          console.error(`Error calculating distance between ${c1.id} and ${c2.id}:`, distError)
          continue
        }

        console.log(`Distance between "${c1.title}" (${c1.address_line_1}) and "${c2.title}" (${c2.address_line_1}):`)
        console.log(`- PostGIS: ${distData} meters`)
        
        // Manual Haversine check
        // Note: PostGIS returns coordinates as [lon, lat]
        const coords1 = (c1.location as any).coordinates
        const coords2 = (c2.location as any).coordinates
        
        const haversineDist = getDistanceKm(coords1[1], coords1[0], coords2[1], coords2[0]) * 1000
        console.log(`- Haversine: ${haversineDist.toFixed(2)} meters`)
        console.log('---')
      }
    }
  }
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

debugDistances()
