import time
from supabase import create_client, Client
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# --- CONFIGURATION ---
SUPABASE_URL = "https://uzgrfdzugfovgkphokqw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Z3JmZHp1Z2ZvdmdrcGhva3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkyNjAzNywiZXhwIjoyMDg1NTAyMDM3fQ.IX6go-2fsbXOOXz-ElBbMwI8xlTgXixUk9mLVtEioYY"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
geolocator = Nominatim(user_agent="oneserve_repair_script")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1) # Respect OSM usage limits

def repair_complaints():
    print("Fetching complaints with missing or default locations...")
    
    # 1. Fetch complaints
    # We look for records that need fixing (adjust the filter as needed)
    response = supabase.table("raw_complaints").select("id, address_line_1, city, state, pincode").execute()
    complaints = response.data

    if not complaints:
        print("No complaints found to repair.")
        return

    print(f"Found {len(complaints)} records. Starting geocoding...")

    for record in complaints:
        try:
            # Construct full address string
            address_str = f"{record['address_line_1']}, {record['city']}, {record['state']}, {record['pincode']}, India"
            print(f"Geocoding: {address_str}")

            location = geocode(address_str)
            
            # Fallback 1: Try without house number (Neighborhood level)
            if not location:
                print(f"  [!] Specific address failed. Trying neighborhood fallback...")
                parts = address_str.split(',')
                if len(parts) > 2:
                    fallback_str = ",".join(parts[1:])
                    location = geocode(fallback_str)
            
            # Fallback 2: Try City + Pincode (Area level)
            if not location:
                print(f"  [!] Neighborhood failed. Trying Area level fallback...")
                area_fallback = f"{record['city']}, {record['pincode']}, India"
                location = geocode(area_fallback)

            if location:
                lat, lng = location.latitude, location.longitude
                
                # CITY CENTER BLACKLIST: Prevent snapping to generic city centers
                # New Delhi center is roughly 28.61, 77.20
                is_city_center = (abs(lat - 28.6138) < 0.01 and abs(lng - 77.2090) < 0.01)
                
                if is_city_center:
                    print(f"  [!] Result is a generic City Center. Clearing to avoid bad snap.")
                    point_wkt = None
                else:
                    print(f"  -> Found: {lat}, {lng} ({location.address[:50]}...)")
                    point_wkt = f"SRID=4326;POINT({lng} {lat})"
            else:
                print(f"  [!] Could not find any match. Clearing location.")
                point_wkt = None

            # Update Raw table
            supabase.table("raw_complaints").update({
                "location": point_wkt
            }).eq("id", record["id"]).execute()

            # Update Processed table
            supabase.table("processed_complaints").update({
                "location": point_wkt
            }).eq("id", record["id"]).execute()
            
            if point_wkt:
                print(f"  [✓] Updated ID: {record['id']}")
            else:
                print(f"  [~] Cleared ID: {record['id']}")

        except Exception as e:
            print(f"  [X] Error processing {record['id']}: {e}")
        
        # Sleep to be extra safe with API limits
        time.sleep(1)

if __name__ == "__main__":
    repair_complaints()
    print("Repair complete!")
