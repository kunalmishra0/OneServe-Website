import random
import uuid
from datetime import datetime, timedelta

# Constants
CATEGORIES = [
    "Sanitation", "Road Maintenance", "Water Supply", "Electricity", 
    "Drainage", "Street Lights", "Parks & Gardens", "Traffic", "Others"
]

FARIDABAD_LOCALITIES = [
    "Sector 15", "Sector 21C", "Sector 37", "Greenfields Colony", "Sainik Colony", 
    "NIT 1", "NIT 5", "Ballabhgarh", "Old Faridabad", "Surajkund", 
    "Charmwood Village", "Ashoka Enclave", "Neharpar", "Sector 14", "Sector 28",
    "Sector 46", "Baselwa Colony", "Dabua Colony", "Jawahar Colony", "Sanjay Colony"
]

DELHI_LOCALITIES = [
    "Okhla Phase 1", "Badarpur", "Sarita Vihar", "Kalkaji", "Govindpuri", 
    "Jasola Vihar", "Nehru Place", "Lajpat Nagar", "Greater Kailash", "Saket"
]

# Weights for city selection (Mostly Faridabad)
CITIES = ["Faridabad"] * 85 + ["New Delhi"] * 15

DESCRIPTIONS = {
    "Sanitation": [
        "Garbage pileup on the main road causing bad smell.",
        "Dustbins overflowing and not collected for 3 days.",
        "Open dumping of waste near the park.",
        "Sanitary workers not sweeping the streets regularly.",
        "Dead animal found on the roadside, needs immediate removal."
    ],
    "Road Maintenance": [
        "Huge pothole causing traffic slowdown and accidents.",
        "Road surface broken poorly after recent rains.",
        "Manhole cover missing, very dangerous for pedestrians.",
        "Illegal speed breaker constructed without marking.",
        "Road construction debris left on the side blocking traffic."
    ],
    "Water Supply": [
        "No water supply since early morning.",
        "Dirty/contaminated water coming from the tap.",
        "Low water pressure in the area for the last week.",
        "Water pipe leakage flooding the street.",
        "Irregular water supply timings."
    ],
    "Electricity": [
        "Frequent power cuts in the locality.",
        "Transformer sparking and making loud noise.",
        "Loose electric wire hanging dangerously low.",
        "Electric meter burnt out.",
        "Voltage fluctuation damaging appliances."
    ],
    "Drainage": [
        "Drains clogged and overflowing onto the street.",
        "Sewage water entering residential area.",
        "Open drain posing a health hazard.",
        "Water logging due to blocked storm water drains.",
        "Foul smell from blocked sewage line."
    ],
    "Street Lights": [
        "Street lights not working in the entire lane.",
        "Street light flickering constantly.",
        "Dark spot near the intersection causing safety issues.",
        "Street light pole damaged by vehicle collision.",
        "Lights on during day time, wasting electricity."
    ],
    "Parks & Gardens": [
        "Park benches broken and unsafe.",
        "Overgrown grass and weeds in the community park.",
        "Swings adjacent to the walking track are damaged.",
        "Waterlogging in the park after rain.",
        "Lack of lighting in the park making it unsafe at night."
    ],
    "Traffic": [
        "Traffic signal not working at the main chowk.",
        "Heavy traffic jam due to illegal parking.",
        "Wrong side driving rampant on this road.",
        "Zebra crossing faded and not visible.",
        "Need a traffic police officer during peak hours."
    ],
    "Others": [
        "Stray dog menace in the colony.",
        "Loudspeaker noise disturbance late at night.",
        "Illegal hoarding blocking the view.",
        "Construction material dumped on public land.",
        "Request for fogging to prevent mosquitoes."
    ]
}

def generate_random_date():
    start_date = datetime.now() - timedelta(days=60)
    random_days = random.randint(0, 60)
    random_seconds = random.randint(0, 86400)
    dt = start_date + timedelta(days=random_days, seconds=random_seconds)
    return dt.isoformat()

def generate_sql():
    # Use a fixed UUID for demo purposes or replace with specific user ID
    USER_ID = "00000000-0000-0000-0000-000000000000" 
    
    entries = []
    
    for _ in range(100):
        city = random.choice(CITIES)
        
        if city == "Faridabad":
            locality = random.choice(FARIDABAD_LOCALITIES)
            state = "Haryana"
            pincode = f"121{random.randint(100, 999)}"
        else:
            locality = random.choice(DELHI_LOCALITIES)
            state = "Delhi"
            pincode = f"110{random.randint(100, 999)}"
            
        category = random.choice(CATEGORIES)
        description_template = random.choice(DESCRIPTIONS[category])
        description = f"{description_template} (Locality: {locality})"
        title = f"{category} Issue in {locality}"
        
        address_line_1 = f"{random.randint(1, 999)}, {locality}"
        address_line_2 = "Near Landmark"
        
        status = "pending_analysis" # Valid status for raw_complaints constraint
        created_at = generate_random_date()
        
        # Escape single quotes in SQL
        title = title.replace("'", "''")
        description = description.replace("'", "''")
        locality = locality.replace("'", "''")
        
        # Using Supabase/Postgres array syntax for text[]
        images = "ARRAY[]::text[]" 
        
        entry = f"('{USER_ID}', '{title}', '{description}', '{category}', '{address_line_1}', '{address_line_2}', '{city}', '{state}', '{pincode}', '{status}', '{created_at}', {images})"
        
        entries.append(entry)

    with open("complaints_data.sql", "w", encoding="utf-8") as f:
        f.write("-- SQL Data for 100 Complaints\n")
        f.write("-- Run this in your Supabase SQL Editor\n")
        f.write(f"-- NOTE: Replace '{USER_ID}' with your actual User ID if needed.\n\n")
        
        f.write("INSERT INTO raw_complaints (user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, status, created_at, images) VALUES\n")
        f.write(",\n".join(entries) + ";\n")
    
    print("Generated complaints_data.sql")

if __name__ == "__main__":
    generate_sql()
