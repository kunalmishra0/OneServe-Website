/**
 * geo.ts - Geographic utilities for OneServe
 */

/**
 * Calculates the distance between two geospatial coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Gets road distance between two points using OSRM (Open Source Routing Machine).
 * Free for demo use, no API key required.
 */
export async function getRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes?.[0]) {
            console.log(`OSRM Success: ${data.routes[0].distance}m`);
            return data.routes[0].distance / 1000; // meters to km
        } else {
            console.warn("OSRM returned non-OK code:", data.code);
        }
    } catch (e) {
        console.error("OSRM Network/CORS Error:", e);
    }
    // Fallback to Haversine * 1.3
    return getDistanceKm(lat1, lon1, lat2, lon2) * 1.3;
}



/**
 * Generates a Google Maps navigation URL using a text address
 */
export function getGoogleMapsAddressUrl(address: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}

/**
 * Generates a Google Maps driving directions URL from "My Location"
 */
export function getGoogleMapsDirectionsUrl(toLat: number, toLon: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${toLat},${toLon}&travelmode=driving`;
}

/**
 * Parses PostGIS POINT from various formats:
 * 1. GeoJSON object (from Supabase if configured)
 * 2. EWKT string: "SRID=4326;POINT(lon lat)"
 * 3. WKT string: "POINT(lon lat)"
 * 4. EWKB Hex: "0101000020E6100000..."
 */
export function parsePostGisPoint(pointStr: any): { lat: number; lon: number } | null {
    if (!pointStr) return null;

    try {
        // Handle GeoJSON format (Supabase default for geography)
        if (typeof pointStr === 'object' && 'coordinates' in pointStr) {
            const [lon, lat] = pointStr.coordinates;
            console.log(`Parsing GeoJSON: Lat ${lat}, Lon ${lon}`);
            return { lat, lon };
        }

        // Handle string format (WKT: POINT(lon lat))
        if (typeof pointStr === 'string' && pointStr.startsWith('POINT')) {
            const matches = pointStr.match(/\((.*)\)/);
            if (matches) {
                const [lon, lat] = matches[1].split(' ').map(Number);
                console.log(`Parsing WKT: Lat ${lat}, Lon ${lon}`);
                return { lat, lon };
            }
        }

        // Handle simple objects
        if (typeof pointStr === 'object') {
            const lat = pointStr.lat || pointStr.latitude;
            const lon = pointStr.lon || pointStr.longitude || pointStr.lng;
            if (typeof lat === 'number' && typeof lon === 'number') {
                return { lat, lon };
            }
        }
    } catch (e) {
        console.error("Failed to parse location:", pointStr, e);
    }

    // 2. Handle Hex format (EWKB)
    // Point EWKB 4326: 0101000020E6100000 + 8 bytes lon + 8 bytes lat
    if (typeof pointStr === 'string' && /^[0-9A-F]+$/i.test(pointStr) && pointStr.length >= 50) {
        try {
            // Very simple parser for the specific 4326 Point EWKB format
            // Lon starts at offset 18 (9 bytes), Lat at offset 34 (17 bytes)
            const lonHex = pointStr.substring(18, 34);
            const latHex = pointStr.substring(34, 50);
            
            const hexToFloat64 = (hex: string) => {
                const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
                // PostGIS usually returns Little Endian (01 at start)
                const view = new DataView(bytes.buffer);
                return view.getFloat64(0, true);
            };

            return {
                lon: hexToFloat64(lonHex),
                lat: hexToFloat64(latHex)
            };
        } catch (e) {
            console.warn("Failed to parse Hex PostGIS point", e);
        }
    }

    // 3. Handle WKT format
    const match = pointStr.match(/POINT\(([^ ]+)\s+([^)]+)\)/i);
    if (match && match.length === 3) {
        return {
            lon: parseFloat(match[1]),
            lat: parseFloat(match[2])
        };
    }

    return null;
}
