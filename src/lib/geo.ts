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
 * Generates a Google Maps URL for a specific location
 */
export function getGoogleMapsUrl(lat: number, lon: number): string {
    return `https://www.google.com/maps?q=${lat},${lon}`;
}

/**
 * Generates a Google Maps driving directions URL
 */
export function getGoogleMapsDirectionsUrl(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}&travelmode=driving`;
}

/**
 * Parses PostGIS POINT string into lat/lon coordinates
 * POINT(longitude latitude) -> { lat, lon }
 * e.g. "POINT(77.3 28.4)" -> { lat: 28.4, lon: 77.3 }
 */
export function parsePostGisPoint(pointStr: string | null): { lat: number; lon: number } | null {
    if (!pointStr) return null;
    
    // Check if it's already an object (sometimes Supabase JS client parses geography depending on setup)
    if (typeof pointStr === 'object' && pointStr !== null && 'coordinates' in pointStr) {
        const coords = (pointStr as any).coordinates;
        return { lat: coords[1], lon: coords[0] };
    }

    const match = pointStr.match(/POINT\(([^ ]+)\s+([^)]+)\)/i);
    if (match && match.length === 3) {
        return {
            lon: parseFloat(match[1]),
            lat: parseFloat(match[2])
        };
    }
    return null;
}
