const fs = require('fs');
const path = require('path');

const LOCATIONS = [
  // Sector 15 / 16 (Central Hub)
  { sector: 'Sector 15', addr1: 'Main Market Road', addr2: 'Near Community Centre', pin: '121007', lat: 28.4024, lng: 77.3190 },
  { sector: 'Sector 15', addr1: 'Pocket A, Lane 4', addr2: 'Near Vidya Mandir School', pin: '121007', lat: 28.4045, lng: 77.3180 },
  { sector: 'Sector 15A', addr1: 'Club Road', addr2: 'Opposite Gymkhana Club', pin: '121007', lat: 28.4060, lng: 77.3160 },
  { sector: 'Sector 16', addr1: 'Sector 16 Main Market', addr2: 'Opposite Metro Pillar 582', pin: '121002', lat: 28.4085, lng: 77.3298 },
  { sector: 'Sector 16A', addr1: 'Nehru Ground Road', addr2: 'Near Magpie Tourist Complex', pin: '121002', lat: 28.4110, lng: 77.3270 },
  
  // NIT Zone
  { sector: 'NIT 1', addr1: 'Block B, 1-2 Chowk', addr2: 'Near Central Market', pin: '121001', lat: 28.3975, lng: 77.2980 },
  { sector: 'NIT 2', addr1: 'Industrial Area Pocket 4', addr2: 'Near ESI Hospital Road', pin: '121001', lat: 28.4010, lng: 77.3015 },
  { sector: 'NIT 3', addr1: 'DAV College Road', addr2: 'Near Gate No. 2', pin: '121001', lat: 28.3930, lng: 77.2940 },
  { sector: 'NIT 5', addr1: 'Hardware Chowk', addr2: 'Near Bus Stand Post', pin: '121005', lat: 28.3890, lng: 77.2910 },
  { sector: 'Badkhal', addr1: 'Badkhal Lake Road', addr2: 'Near Tourist Resort Gate', pin: '121001', lat: 28.4200, lng: 77.2850 },

  // Old Faridabad Zone
  { sector: 'Old Faridabad', addr1: 'Railway Road', addr2: 'Near Railway Station Platform 1', pin: '121002', lat: 28.4208, lng: 77.3142 },
  { sector: 'Old Faridabad', addr1: 'Kheri Gate Chowk', addr2: 'Main Grain Market', pin: '121002', lat: 28.4245, lng: 77.3180 },
  { sector: 'Old Faridabad', addr1: 'Barahi Talao Road', addr2: 'Near Old Tehsil Office', pin: '121002', lat: 28.4180, lng: 77.3110 },

  // Sector 14, 21C, 28
  { sector: 'Sector 14', addr1: 'Main HUDA Market', addr2: 'Near DPS Sector 14', pin: '121007', lat: 28.4110, lng: 77.3240 },
  { sector: 'Sector 21C', addr1: 'Block E Central Road', addr2: 'Near SRS Cinema', pin: '121001', lat: 28.4310, lng: 77.2980 },
  { sector: 'Sector 28', addr1: 'Mathura Road Service Lane', addr2: 'Near Sector 28 Metro Station', pin: '121008', lat: 28.4410, lng: 77.3140 },

  // Greater Faridabad (Neharpar)
  { sector: 'Sector 82', addr1: 'BPTP Park Grandeura Outer', addr2: 'Near Master Road', pin: '121002', lat: 28.3920, lng: 77.3510 },
  { sector: 'Sector 86', addr1: 'Omaxe Heights Connector', addr2: 'Near Nahar Singh Palace Road', pin: '121002', lat: 28.4050, lng: 77.3620 },

  // Ballabgarh (Intentionally Out of 5km Radius)
  { sector: 'Ballabgarh', addr1: 'Main Mathura Highway', addr2: 'Near Ballabgarh Bus Terminal', pin: '121004', lat: 28.3375, lng: 77.3248 },
  { sector: 'Ballabgarh', addr1: 'Chawla Colony Main Market', addr2: 'Near Arya Samaj Mandir', pin: '121004', lat: 28.3410, lng: 77.3210 }
];

function getCategoryImages(dirName) {
  const fullPath = path.join(__dirname, '..', 'public', 'seed-images', dirName);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png')).map(f => `/seed-images/${dirName}/${f}`);
}

const CATEGORIES = {
  'Road Maintenance': {
    prefix: 'ROA',
    count: 25,
    images: getCategoryImages('roads'),
    titles: [
      'Hazardous asphalt crater causing vehicle bottoming out',
      'Damaged road expansion joint on flyover descent',
      'Sunken sewer trench across arterial lane',
      'Missing heavy cast-iron manhole cover on busy road',
      'Severe bitumen crumbling with loose gravel spread',
      'Collapsed pavement shoulder threatening pedestrian fall',
      'Deep pothole cluster near school crossing',
      'Severed road curb causing vehicle alignment hazard'
    ]
  },
  'Sanitation': {
    prefix: 'SAN',
    count: 20,
    images: getCategoryImages('sanitation'),
    titles: [
      'Commercial waste dumpster overflowing onto main walkway',
      'Illegal construction demolition waste dumped on roadside',
      'Uncollected organic market waste decomposing for 4 days',
      'Plastic packaging litter scattered around community park',
      'Bio-hazard animal carcass left unattended on lane verge',
      'Blocked municipal bin enclosure attracting stray dogs',
      'Rotting vegetable refuse blocking stormwater intake',
      'Littered public plaza outside commercial complex'
    ]
  },
  'Electricity': {
    prefix: 'ELE',
    count: 15,
    images: getCategoryImages('electricity'),
    titles: [
      'High-tension overhead cable sagging below safety clearance',
      'Sparking transformer casing with loud electrical buzzing',
      'Burnt residential distribution meter box emitting smoke',
      'Exposed live joint box at pedestrian foot level',
      'Bent utility pole leaning dangerously over roadway',
      'Frequent voltage surges tripping residential feeder lines',
      'Uncovered distribution feeder pillar in children play area'
    ]
  },
  'Street Lights': {
    prefix: 'LGT',
    count: 15,
    images: getCategoryImages('streetlights'),
    titles: [
      'Complete dark stretch on main intersection causing accident risk',
      'Broken sodium vapor fixture hanging precariously from pole',
      'Daylight timer failure with 15 streetlights burning at noon',
      'Flickering high-mast lamp pole at commercial junction',
      'Burnt fuse link leaving entire residential pocket in darkness',
      'Damaged lamp housing after heavy wind storm'
    ]
  },
  'Drainage': {
    prefix: 'DRN',
    count: 12,
    images: getCategoryImages('drainage'),
    titles: [
      'Stormwater drain completely choked with silt and plastic',
      'Overflowing domestic sewage manhole flooding street surface',
      'Damaged culvert grating allowing debris to block outflow',
      'Wastewater backflow entering residential ground floor gates',
      'Stagnant stormwater breeding mosquitoes outside primary school',
      'Collapsed drain brickwork causing sidewalk depression'
    ]
  },
  'Water Supply': {
    prefix: 'WTR',
    count: 10,
    images: getCategoryImages('water'),
    titles: [
      'Pressurized underground water main burst flooding road',
      'Severely contaminated murky brown tap water with foul odor',
      'Total absence of morning municipal water supply in block',
      'Sub-surface supply line leak weakening building foundation',
      'Low distribution pressure unable to reach first-floor storage',
      'Broken municipal pipeline valve leaking thousands of liters'
    ]
  },
  'Parks & Gardens': {
    prefix: 'PRK',
    count: 5,
    images: getCategoryImages('parks'),
    titles: [
      'Broken concrete park benches with exposed sharp rebar',
      'Wild weeds and thorny brush covering children play area',
      'Damaged chain-link fencing allowing stray cattle into park',
      'Broken children swing set posing injury hazard',
      'Dry fallen tree branch hanging over morning walking track'
    ]
  },
  'Traffic': {
    prefix: 'TRF',
    count: 3,
    images: getCategoryImages('traffic'),
    titles: [
      'Traffic signal completely dead at four-way intersection',
      'Illegal commercial truck parking blocking single lane curve',
      'Obscured speed-breaker causing emergency vehicle braking',
      'Missing directional signage at flyover divergence point'
    ]
  }
};

const OFFICIALS = [
  { id: 'e0000000-0000-0000-0000-000000000001', name: 'Dr. Rajesh Khurana', email: 'commissioner@oneserve.in', tier: 'executive_authority', desig: 'Municipal Commissioner', dept: 'Municipal Corporation Faridabad' },
  { id: 'e0000000-0000-0000-0000-000000000002', name: 'Smt. Meenakshi Lekhi', email: 'joint.comm@oneserve.in', tier: 'executive_authority', desig: 'Joint Municipal Commissioner', dept: 'Municipal Corporation Faridabad' },
  { id: 'eb000000-0000-0000-0000-000000000001', name: 'Insp. Vikram Singh', email: 'sho.sector16@hrypolice.gov.in', tier: 'emergency_responder', desig: 'Station House Officer (SHO)', dept: 'Haryana Police, Faridabad' },
  { id: 'eb000000-0000-0000-0000-000000000002', name: 'ACP Devender Kumar', email: 'acp.traffic@hrypolice.gov.in', tier: 'emergency_responder', desig: 'Assistant Commissioner of Police (Traffic)', dept: 'Faridabad Traffic Police' },
  { id: 'eb000000-0000-0000-0000-000000000003', name: 'Dr. Anita Sengupta', email: 'cmo.hospital@hryhealth.gov.in', tier: 'emergency_responder', desig: 'Chief Medical Officer', dept: 'District Civil Hospital, BK Chowk' },
  { id: 'ec000000-0000-0000-0000-000000000001', name: 'Er. Sandeep Malik', email: 'je.malik@pwdharyana.gov.in', tier: 'civic_official', desig: 'Junior Engineer (Civil)', dept: 'PWD Public Works Department' },
  { id: 'ec000000-0000-0000-0000-000000000002', name: 'Er. Kavita Sharma', email: 'sdo.electric@dhbvn.gov.in', tier: 'civic_official', desig: 'Sub-Divisional Officer', dept: 'DHBVN Electricity Distribution' }
];

const CITIZENS = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Rahul Sharma', email: 'citizen@oneserve.in', phone: '+91 98110 24892', addr: 'House #412, Main Road, Sector 15' },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Sunita Devi', email: 'sunita.devi@gmail.com', phone: '+91 98711 02938', addr: 'Plot 45, Kheri Road, Old Faridabad' },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Amit Saxena', email: 'amit.saxena@outlook.com', phone: '+91 99102 38491', addr: 'House 88, Sector 21C' },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Pooja Verma', email: 'pooja.verma@yahoo.co.in', phone: '+91 98188 47291', addr: 'Flat 12B, Grandeura, Sector 82' },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'Rajesh Gupta', email: 'rajesh.gupta@gmail.com', phone: '+91 98103 91029', addr: 'Shop 14, 1-2 Chowk, NIT 1' },
  { id: 'c0000000-0000-0000-0000-000000000006', name: 'Meena Kumari', email: 'meena.k@gmail.com', phone: '+91 98119 28374', addr: 'House 512, Chawla Colony, Ballabgarh' },
  { id: 'c0000000-0000-0000-0000-000000000007', name: 'Harish Chandra', email: 'harish.c@gmail.com', phone: '+91 99110 92837', addr: 'House 204, Sector 16' },
  { id: 'c0000000-0000-0000-0000-000000000008', name: 'Geeta Rani', email: 'geeta.rani@gmail.com', phone: '+91 98101 82736', addr: 'Pocket 3, Sector 15A' },
  { id: 'c0000000-0000-0000-0000-000000000009', name: 'Vikram Batra', email: 'v.batra@gmail.com', phone: '+91 98182 73645', addr: 'House 71, Sector 14' },
  { id: 'c0000000-0000-0000-0000-000000000010', name: 'Deepak Joshi', email: 'deepak.joshi@gmail.com', phone: '+91 99104 82716', addr: 'Lane 2, Badkhal Enclave' }
];

const WORKERS = [
  // Zone 1: Central Faridabad (Sectors 14, 15, 16)
  { id: 'da000000-0000-0000-0000-000000000001', auth_id: 'ba000000-0000-0000-0000-000000000001', name: 'Amit Verma', email: 'worker.roads@oneserve.in', phone: '+91 98710 44321', role: 'Road Technician', zone: 'Sector 15 Hub', lat: 28.4024, lng: 77.3190, status: 'busy', rating: 4.8, handled: 42, code: 'ROAD15' },
  { id: 'da000000-0000-0000-0000-000000000002', auth_id: null, name: 'Satish Bhardwaj', email: 'satish.bhardwaj@oneserve.in', phone: '+91 98112 34567', role: 'Street Light Technician', zone: 'Sector 15 Hub', lat: 28.4040, lng: 77.3185, status: 'available', rating: 4.9, handled: 95, code: 'LGT15' },
  { id: 'da000000-0000-0000-0000-000000000003', auth_id: null, name: 'Manoj Yadav', email: 'worker.water@oneserve.in', phone: '+91 98101 23456', role: 'Water Supply Worker', zone: 'Sector 16 Hub', lat: 28.4085, lng: 77.3298, status: 'available', rating: 4.8, handled: 54, code: 'WTR16' },
  { id: 'da000000-0000-0000-0000-000000000004', auth_id: null, name: 'Vikas Nagar', email: 'vikas.nagar@oneserve.in', phone: '+91 99105 67890', role: 'Drainage Worker', zone: 'Sector 14 Hub', lat: 28.4110, lng: 77.3240, status: 'busy', rating: 4.7, handled: 63, code: 'DRN14' },
  { id: 'da000000-0000-0000-0000-000000000005', auth_id: null, name: 'Dharmender Singh', email: 'worker.parks@oneserve.in', phone: '+91 98719 87654', role: 'Gardener', zone: 'Town Park Hub', lat: 28.3885, lng: 77.3180, status: 'available', rating: 4.6, handled: 29, code: 'PRK12' },
  { id: 'da000000-0000-0000-0000-000000000006', auth_id: null, name: 'Brijesh Mishra', email: 'brijesh.mishra@oneserve.in', phone: '+91 98111 22334', role: 'Electrician', zone: 'MCF Headquarters', lat: 28.3895, lng: 77.3160, status: 'busy', rating: 4.9, handled: 112, code: 'EMG12' },

  // Zone 2: NIT Zone
  { id: 'da000000-0000-0000-0000-000000000007', auth_id: 'ba000000-0000-0000-0000-000000000002', name: 'Rajesh Kumar', email: 'worker.sanitation@oneserve.in', phone: '+91 98188 55920', role: 'Sanitation Worker', zone: 'NIT Faridabad Hub', lat: 28.3962, lng: 77.2952, status: 'available', rating: 4.9, handled: 87, code: 'SANI01' },
  { id: 'da000000-0000-0000-0000-000000000008', auth_id: null, name: 'Sunil Khatri', email: 'sunil.khatri@oneserve.in', phone: '+91 98102 33445', role: 'Road Technician', zone: 'NIT 1 Market Depot', lat: 28.3980, lng: 77.2975, status: 'available', rating: 4.5, handled: 38, code: 'ROAD01' },
  { id: 'da000000-0000-0000-0000-000000000009', auth_id: null, name: 'Mohan Lal', email: 'mohan.lal@oneserve.in', phone: '+91 99103 44556', role: 'Sanitation Worker', zone: 'NIT 5 Hardware Chowk', lat: 28.3890, lng: 77.2910, status: 'busy', rating: 4.8, handled: 72, code: 'SANI05' },
  { id: 'da000000-0000-0000-0000-000000000010', auth_id: null, name: 'Deepak Rawat', email: 'deepak.rawat@oneserve.in', phone: '+91 98714 55667', role: 'Drainage Worker', zone: 'NIT 2 Industrial', lat: 28.4010, lng: 77.3015, status: 'available', rating: 4.6, handled: 41, code: 'DRN02' },
  { id: 'da000000-0000-0000-0000-000000000011', auth_id: null, name: 'Ashok Gehlot', email: 'ashok.gehlot@oneserve.in', phone: '+91 98115 66778', role: 'Street Light Technician', zone: 'Neelam Flyover Post', lat: 28.4015, lng: 77.3090, status: 'available', rating: 4.8, handled: 41, code: 'TRF01' },
  { id: 'da000000-0000-0000-0000-000000000012', auth_id: null, name: 'Mahesh Tyagi', email: 'mahesh.tyagi@oneserve.in', phone: '+91 98116 77889', role: 'Sanitation Worker', zone: 'Badkhal Enclave Hub', lat: 28.4200, lng: 77.2850, status: 'available', rating: 4.8, handled: 63, code: 'SANI09' },

  // Zone 3: Old Faridabad Zone
  { id: 'da000000-0000-0000-0000-000000000013', auth_id: 'ba000000-0000-0000-0000-000000000003', name: 'Suresh Chand', email: 'worker.electric@oneserve.in', phone: '+91 99102 77123', role: 'Electrician', zone: 'Old Faridabad Zone', lat: 28.4208, lng: 77.3142, status: 'busy', rating: 4.7, handled: 31, code: 'ELEC16' },
  { id: 'da000000-0000-0000-0000-000000000014', auth_id: null, name: 'Kuldeep Singh', email: 'kuldeep.singh@oneserve.in', phone: '+91 98717 88990', role: 'Electrician', zone: 'Old Faridabad Kheri Gate', lat: 28.4245, lng: 77.3180, status: 'available', rating: 4.7, handled: 59, code: 'ELEC02' },
  { id: 'da000000-0000-0000-0000-000000000015', auth_id: null, name: 'Naresh Sharma', email: 'naresh.sharma@oneserve.in', phone: '+91 98118 99001', role: 'Water Supply Worker', zone: 'Old Faridabad Railway Rd', lat: 28.4190, lng: 77.3125, status: 'busy', rating: 4.8, handled: 68, code: 'WTR02' },
  { id: 'da000000-0000-0000-0000-000000000016', auth_id: null, name: 'Praveen Tanwar', email: 'praveen.tanwar@oneserve.in', phone: '+91 99109 00112', role: 'Sanitation Worker', zone: 'Old Faridabad Grain Mkt', lat: 28.4260, lng: 77.3155, status: 'available', rating: 4.9, handled: 84, code: 'SANI02' },
  { id: 'da000000-0000-0000-0000-000000000017', auth_id: null, name: 'Gopal Krishan', email: 'gopal.krishan@oneserve.in', phone: '+91 98110 11223', role: 'Street Light Technician', zone: 'Sector 21C Central Hub', lat: 28.4310, lng: 77.2980, status: 'available', rating: 4.9, handled: 76, code: 'LGT21' },

  // Zone 4: Ballabgarh Zone
  { id: 'da000000-0000-0000-0000-000000000018', auth_id: null, name: 'Joginder Singh', email: 'joginder.singh@oneserve.in', phone: '+91 98711 22334', role: 'Road Technician', zone: 'Ballabgarh Bus Stand', lat: 28.3375, lng: 77.3248, status: 'available', rating: 4.6, handled: 35, code: 'ROAD04' },
  { id: 'da000000-0000-0000-0000-000000000019', auth_id: null, name: 'Rameshwar Dayal', email: 'rameshwar.dayal@oneserve.in', phone: '+91 98112 33445', role: 'Sanitation Worker', zone: 'Ballabgarh Chawla Colony', lat: 28.3410, lng: 77.3210, status: 'busy', rating: 4.7, handled: 49, code: 'SANI04' },
  { id: 'da000000-0000-0000-0000-000000000020', auth_id: null, name: 'Anil Chauhan', email: 'anil.chauhan@oneserve.in', phone: '+91 99113 44556', role: 'Street Light Technician', zone: 'Ballabgarh Main Chowk', lat: 28.3350, lng: 77.3280, status: 'available', rating: 4.8, handled: 52, code: 'LGT04' },
  { id: 'da000000-0000-0000-0000-000000000021', auth_id: null, name: 'Mukesh Kumar', email: 'mukesh.kumar@oneserve.in', phone: '+91 98114 55667', role: 'Drainage Worker', zone: 'Ballabgarh Mathura Road', lat: 28.3390, lng: 77.3265, status: 'available', rating: 4.5, handled: 28, code: 'DRN04' },
  { id: 'da000000-0000-0000-0000-000000000022', auth_id: null, name: 'Devinder Pal', email: 'devinder.pal@oneserve.in', phone: '+91 98715 66778', role: 'Road Technician', zone: 'Sector 11 Mathura Road', lat: 28.3750, lng: 77.3220, status: 'available', rating: 4.6, handled: 34, code: 'ROAD11' },

  // Zone 5: Greater Faridabad (Neharpar)
  { id: 'da000000-0000-0000-0000-000000000023', auth_id: null, name: 'Ajay Tewatia', email: 'ajay.tewatia@oneserve.in', phone: '+91 98116 77889', role: 'Water Supply Worker', zone: 'Sector 82 Greater FBD', lat: 28.3920, lng: 77.3510, status: 'available', rating: 4.7, handled: 33, code: 'WTR82' },
  { id: 'da000000-0000-0000-0000-000000000024', auth_id: null, name: 'Hemant Gurjar', email: 'hemant.gurjar@oneserve.in', phone: '+91 99117 88990', role: 'Road Technician', zone: 'Sector 86 BPTP Corridor', lat: 28.4050, lng: 77.3620, status: 'busy', rating: 4.6, handled: 27, code: 'ROAD86' },
  { id: 'da000000-0000-0000-0000-000000000025', auth_id: null, name: 'Ravi Saini', email: 'ravi.saini@oneserve.in', phone: '+91 98118 99001', role: 'Gardener', zone: 'Sector 84 Green Belt', lat: 28.3980, lng: 77.3580, status: 'available', rating: 4.8, handled: 45, code: 'PRK84' },
  { id: 'da000000-0000-0000-0000-000000000026', auth_id: null, name: 'Suraj Bhan', email: 'suraj.bhan@oneserve.in', phone: '+91 98719 00112', role: 'Drainage Worker', zone: 'Sector 28 Metro Station', lat: 28.4410, lng: 77.3140, status: 'busy', rating: 4.7, handled: 58, code: 'DRN28' }
];

let sql = `-- ==============================================================================
-- ONESERVE V2: MASTER 105-COMPLAINT & 26-WORKFORCE DEMO SEED SCRIPT
-- ==============================================================================
-- Run this in Supabase SQL Editor.
-- This script:
--   1. Adds dual-factor hierarchy columns to profiles
--   2. Ensures storage bucket & public policies for complaints
--   3. Deploys auto_escalate_priorities_v2() procedure
--   4. Seeds official authority profiles, citizen profiles, and 26 staff workers
--   5. Seeds exactly 105 realistic Faridabad complaints with 97 unique category images
--      (Rahul Sharma owns exactly 3 complaints: fresh, in-progress, resolved)
--   6. Deploys refresh_demo_complaints_timestamps() procedure
-- ==============================================================================

-- 1. EXTEND PROFILES & PROCESSED TABLES
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profession_tier TEXT DEFAULT 'standard' 
CHECK (profession_tier IN ('standard', 'civic_official', 'emergency_responder', 'executive_authority'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS official_designation TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_official_verified BOOLEAN DEFAULT false;

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS sla_hours_remaining NUMERIC(5,1);

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS auto_escalation_reason TEXT;

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. STORAGE BUCKET CONFIGURATION
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaints', 'complaints', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'complaints');
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'complaints');
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'complaints');

-- 3. AUTO-ESCALATE STORED PROCEDURE
CREATE OR REPLACE FUNCTION auto_escalate_priorities_v2()
RETURNS jsonb AS $$
DECLARE
    r RECORD;
    v_age_hours NUMERIC;
    v_new_level TEXT;
    v_new_score NUMERIC;
    v_reason TEXT;
    v_sla_rem NUMERIC;
    v_updated_count INT := 0;
BEGIN
    FOR r IN
        SELECT 
            pc.id,
            pc.priority_score,
            pc.priority_level,
            pc.complaint_status,
            rc.created_at,
            COALESCE(p.profession_tier, 'standard') as profession_tier,
            p.official_designation,
            p.department
        FROM processed_complaints pc
        JOIN raw_complaints rc ON pc.id = rc.id
        LEFT JOIN profiles p ON rc.user_id = p.id
        WHERE pc.complaint_status IN ('submitted', 'verified', 'in_progress', 'pending_review')
    LOOP
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600;
        v_reason := NULL;
        v_sla_rem := NULL;

        -- Tier 1: Executive Authority
        IF r.profession_tier = 'executive_authority' THEN
            IF v_age_hours >= 12 THEN
                v_new_level := 'critical';
                v_new_score := 9.5;
                v_reason := 'Executive Authority grievance pending > 12h (Critical SLA breach)';
                v_sla_rem := 0.0;
            ELSE
                v_new_level := 'high';
                v_new_score := 8.0;
                v_reason := 'Official Grievance: ' || COALESCE(r.official_designation, 'Executive Authority');
                v_sla_rem := 12.0 - v_age_hours;
            END IF;

        -- Tier 2: Emergency Responder
        ELSIF r.profession_tier = 'emergency_responder' THEN
            IF v_age_hours >= 36 THEN
                v_new_level := 'critical';
                v_new_score := 9.0;
                v_reason := 'Emergency Responder issue unattended > 36h';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 18 THEN
                v_new_level := 'high';
                v_new_score := 7.5;
                v_reason := 'Official Report: ' || COALESCE(r.official_designation, 'Emergency Responder');
                v_sla_rem := 36.0 - v_age_hours;
            ELSE
                v_new_level := 'medium';
                v_new_score := 5.5;
                v_reason := 'Fresh submission from Emergency Services';
                v_sla_rem := 18.0 - v_age_hours;
            END IF;

        -- Tier 3: Civic Official
        ELSIF r.profession_tier = 'civic_official' THEN
            IF v_age_hours >= 48 THEN
                v_new_level := 'critical';
                v_new_score := 8.5;
                v_reason := 'Civic inspection notice unattended > 48h';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 24 THEN
                v_new_level := 'high';
                v_new_score := 7.0;
                v_reason := 'Notice from ' || COALESCE(r.department, 'Civic Official');
                v_sla_rem := 48.0 - v_age_hours;
            ELSE
                v_new_level := 'medium';
                v_new_score := 5.0;
                v_reason := 'Departmental notice under review';
                v_sla_rem := 24.0 - v_age_hours;
            END IF;

        -- Tier 4: Standard Citizen
        ELSE
            IF v_age_hours >= 72 THEN
                v_new_level := 'critical';
                v_new_score := 8.5;
                v_reason := 'Citizen complaint unattended > 72h (72h SLA breach)';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 48 THEN
                v_new_level := 'high';
                v_new_score := 7.0;
                v_reason := 'Citizen complaint pending > 48h (Auto-escalated)';
                v_sla_rem := 72.0 - v_age_hours;
            ELSIF v_age_hours >= 24 THEN
                v_new_level := 'medium';
                v_new_score := 5.0;
                v_reason := 'Citizen complaint pending > 24h';
                v_sla_rem := 48.0 - v_age_hours;
            ELSE
                v_new_level := 'low';
                v_new_score := 3.0;
                v_reason := 'Fresh citizen submission (Standard queue)';
                v_sla_rem := 24.0 - v_age_hours;
            END IF;
        END IF;

        UPDATE processed_complaints
        SET 
            priority_level = v_new_level,
            priority_score = v_new_score,
            auto_escalation_reason = v_reason,
            sla_hours_remaining = GREATEST(0.0, ROUND(v_sla_rem, 1)),
            last_escalated_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'records_evaluated', v_updated_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. INSERT / UPSERT PROFILES & OFFICIALS
DO $$
BEGIN
`;

// Insert into auth.users first so foreign key constraints on profiles succeed
OFFICIALS.forEach(o => {
  sql += `
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${o.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${o.email}', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"${o.name}"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  `;
});

CITIZENS.forEach(c => {
  sql += `
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${c.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${c.email}', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"${c.name}"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  `;
});

sql += `
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"MCF Admin"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.roads@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Amit Verma"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.sanitation@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rajesh Kumar"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.electric@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Suresh Chand"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
`;

// Insert Profiles
OFFICIALS.forEach(o => {
  sql += `
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('${o.id}', '${o.email}', 'citizen', '${o.tier}', '${o.desig}', '${o.dept}', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('${o.id}', '${o.name}', '${o.email}', '+91 98000 00000', '${o.dept}, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  `;
});

CITIZENS.forEach(c => {
  sql += `
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('${c.id}', '${c.email}', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('${c.id}', '${c.name}', '${c.email}', '${c.phone}', '${c.addr}', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  `;
});

// Admin & Worker base profiles
sql += `
    INSERT INTO profiles (id, email, role)
    VALUES 
        ('a0000000-0000-0000-0000-000000000001', 'admin@oneserve.in', 'admin'),
        ('ba000000-0000-0000-0000-000000000001', 'worker.roads@oneserve.in', 'worker'),
        ('ba000000-0000-0000-0000-000000000002', 'worker.sanitation@oneserve.in', 'worker'),
        ('ba000000-0000-0000-0000-000000000003', 'worker.electric@oneserve.in', 'worker')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
`;

// Insert 26 Workers into staff
WORKERS.forEach(w => {
  sql += `
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('${w.id}', ${w.auth_id ? `'${w.auth_id}'` : 'NULL'}, '${w.phone}', '${w.name}', '${w.role}', '${w.zone}', '${w.status}', ${w.rating}, ${w.handled}, '${w.code}', ST_SetSRID(ST_MakePoint(${w.lng}, ${w.lat}), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  `;
});

sql += `
END $$;

-- 5. SEED 105 REALISTIC COMPLAINTS
-- Clean out old demo raw_complaints and child records to ensure pure state
UPDATE staff SET current_assignment_id = NULL;
DELETE FROM completed_complaints;
DELETE FROM processed_complaints;
DELETE FROM raw_complaints;

DO $$
DECLARE
    v_c_id UUID;
    v_u_id UUID;
    v_ref TEXT;
BEGIN
`;

// Build 105 complaints
// 1. Rahul Sharma's 3 Demo Complaints
sql += `
    -- Rahul Sharma Demo Complaint 1: Fresh submission in Sec 15
    v_c_id := 'c1000000-0000-0000-0000-000000000001';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-3819201', 'c0000000-0000-0000-0000-000000000001', 'Hazardous asphalt crater on Sector 15 Market Main Road', 'Deep road crater developing near commercial entrance causing tyre damage.', 'Road Maintenance', 'Sector 15 Market Main Road', 'Near Community Centre', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3190, 28.4024), 4326), ARRAY['/seed-images/roads/pothole_1.jpg'], 'pending_analysis', NOW() - interval '2 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', NULL, 3.0, 'low', 'submitted', ST_SetSRID(ST_MakePoint(77.3190, 28.4024), 4326));

    -- Rahul Sharma Demo Complaint 2: In-Progress assigned to Amit Verma (Worker 1)
    v_c_id := 'c1000000-0000-0000-0000-000000000002';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-5019283', 'c0000000-0000-0000-0000-000000000001', 'Street light pole short circuit outside Lane 4', 'Pole sparking during evening hours, fixture not lighting street.', 'Street Lights', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3180, 28.4045), 4326), ARRAY['/seed-images/streetlights/broken_lamp_1.jpg'], 'processed', NOW() - interval '18 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 5.0, 'medium', 'in_progress', ST_SetSRID(ST_MakePoint(77.3180, 28.4045), 4326));

    -- Rahul Sharma Demo Complaint 3: Resolved with proof and ready for rating
    v_c_id := 'c1000000-0000-0000-0000-000000000003';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-6192048', 'c0000000-0000-0000-0000-000000000001', 'Uncollected garbage heap cleared outside Pocket B Park', 'Bulk waste accumulation cleared by municipal tractor crew.', 'Sanitation', 'Pocket B Residential Park', 'Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3175, 28.4030), 4326), ARRAY['/seed-images/sanitation/garbage_pile_1.jpg'], 'processed', NOW() - interval '24 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000007', 4.0, 'low', 'resolved', ST_SetSRID(ST_MakePoint(77.3175, 28.4030), 4326));

    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    VALUES (gen_random_uuid(), v_c_id, 'da000000-0000-0000-0000-000000000007', '/seed-images/sanitation/dumpster_1.jpg', 'Cleared using hydraulic compactor truck. Bleaching powder sprayed.', 85, 5, 'Quick response, park entrance is clean now!', NOW() - interval '2 hours', NOW() - interval '2 hours');
`;

// Remaining 102 complaints:
// 14 Official complaints + 88 other citizen complaints
let complaintIndex = 4;
let categoryKeys = Object.keys(CATEGORIES);

let generated = 0;
while (generated < 102) {
  let catKey = categoryKeys[generated % categoryKeys.length];
  let catMeta = CATEGORIES[catKey];
  let loc = LOCATIONS[generated % LOCATIONS.length];
  
  // Pick from the rich array of 10-15 unique images for this category!
  let img = catMeta.images[generated % catMeta.images.length];
  let title = catMeta.titles[generated % catMeta.titles.length] + ' in ' + loc.sector;
  
  // Decide author: First 14 are officials, rest are CITIZENS
  let authorId;
  let elapsedHours;
  if (generated < 14) {
    let off = OFFICIALS[generated % OFFICIALS.length];
    authorId = off.id;
    if (off.tier === 'executive_authority') elapsedHours = (generated % 2 === 0) ? 14 : 6;
    else if (off.tier === 'emergency_responder') elapsedHours = (generated % 2 === 0) ? 22 : 10;
    else elapsedHours = (generated % 2 === 0) ? 28 : 8;
  } else {
    let cit = CITIZENS[(generated - 14) % (CITIZENS.length - 1) + 1]; // skip Rahul (index 0)
    authorId = cit.id;
    let mod = generated % 5;
    if (mod === 0) elapsedHours = 78;
    else if (mod === 1) elapsedHours = 52;
    else if (mod === 2) elapsedHours = 28;
    else if (mod === 3) elapsedHours = 14;
    else elapsedHours = 3;
  }

  // Ref ID format: PREFIX-7digit
  let numPart = String(1000000 + complaintIndex * 137).padStart(7, '0');
  let refId = `${catMeta.prefix}-${numPart}`;
  let hexIndex = String(complaintIndex).padStart(12, '0');
  let compUuid = `c1000000-0000-0000-0000-${hexIndex}`;

  sql += `
    v_c_id := '${compUuid}';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, '${refId}', '${authorId}', '${title.replace(/'/g, "''")}', 'Citizen reported issue regarding ${catKey.toLowerCase()} requiring municipal maintenance and inspection.', '${catKey}', '${loc.addr1.replace(/'/g, "''")}', '${loc.addr2.replace(/'/g, "''")}, ${loc.sector}', 'Faridabad', 'Haryana', '${loc.pin}', ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326), ARRAY['${img}'], 'processed', NOW() - interval '${elapsedHours} hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, '${authorId}', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326));
  `;

  complaintIndex++;
  generated++;
}

// Add worker completed task history seed for ETA rolling average
sql += `
    -- Seed realistic task history for workers to establish ETA baseline
    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    SELECT 
        gen_random_uuid(),
        rc.id,
        'da000000-0000-0000-0000-000000000001',
        '/seed-images/roads/pothole_2.jpg',
        'Asphalt resurfaced and roller compacted.',
        95,
        5,
        'Great work, very smooth finish.',
        NOW() - interval '5 days',
        NOW() - interval '5 days'
    FROM raw_complaints rc WHERE rc.category = 'Road Maintenance' AND rc.id != 'c1000000-0000-0000-0000-000000000001' LIMIT 1;
    

    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    SELECT 
        gen_random_uuid(),
        rc.id,
        'da000000-0000-0000-0000-000000000013',
        '/seed-images/electricity/meter_box_1.jpg',
        'Fuse box replaced and live cables re-insulated.',
        110,
        4,
        'Prompt electrical service.',
        NOW() - interval '3 days',
        NOW() - interval '3 days'
    FROM raw_complaints rc WHERE rc.category = 'Electricity' LIMIT 1;
    

    -- Run auto-escalation right away to set initial scores
    PERFORM auto_escalate_priorities_v2();

END $$;

-- 6. STORED PROCEDURE: REFRESH DEMO TIMESTAMPS & WORKFORCE STATES
CREATE OR REPLACE FUNCTION refresh_demo_complaints_timestamps()
RETURNS jsonb AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- 1. Restore worker assignments to pristine demo baseline
    UPDATE processed_complaints 
    SET staff_id = NULL, complaint_status = 'verified'
    WHERE id NOT IN ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003')
      AND complaint_status != 'resolved';

    -- Re-assign Worker 1 (Amit Verma) to complaint 2
    UPDATE processed_complaints
    SET staff_id = 'da000000-0000-0000-0000-000000000001', complaint_status = 'in_progress'
    WHERE id = 'c1000000-0000-0000-0000-000000000002';

    -- Reset staff statuses to baseline (w0000001 busy, w0000002 available, w0000003 busy)
    UPDATE staff SET status = 'available';
    UPDATE staff SET status = 'busy' WHERE id IN ('da000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000004', 'da000000-0000-0000-0000-000000000006', 'da000000-0000-0000-0000-000000000009', 'da000000-0000-0000-0000-000000000013', 'da000000-0000-0000-0000-000000000015', 'da000000-0000-0000-0000-000000000019', 'da000000-0000-0000-0000-000000000024', 'da000000-0000-0000-0000-000000000026');

    -- 2. Shift timestamps across 5 relative operational buckets
    -- Bucket 1: 78h ago (> 72h SLA breach -> Critical for citizens)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '78 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id LIMIT 20
    );

    -- Bucket 2: 52h ago (> 48h SLA breach -> High)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '52 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 20 LIMIT 25
    );

    -- Bucket 3: 28h ago (> 24h SLA breach -> Medium)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '28 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 45 LIMIT 25
    );

    -- Bucket 4: 14h ago (> 12h Executive breach -> Critical for Officials)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '14 hours'
    WHERE user_id IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001');

    -- Bucket 5: Fresh 2 hours ago (including Rahul's fresh complaint)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '2 hours'
    WHERE id = 'c1000000-0000-0000-0000-000000000001'
       OR id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 70
    );

    -- Rahul's In-Progress complaint (18h ago) and Resolved complaint (24h ago)
    UPDATE raw_complaints SET created_at = NOW() - interval '18 hours' WHERE id = 'c1000000-0000-0000-0000-000000000002';
    UPDATE raw_complaints SET created_at = NOW() - interval '24 hours' WHERE id = 'c1000000-0000-0000-0000-000000000003';

    -- 3. Recalculate all priorities dynamically in SQL
    PERFORM auto_escalate_priorities_v2();

    SELECT COUNT(*) INTO v_count FROM raw_complaints;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Demo baseline restored: dates staggered, worker assignments reset, and priorities re-evaluated.',
        'total_complaints', v_count,
        'refreshed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const destPath = path.join(__dirname, '..', 'migrations', 'v16_master_demo_seed.sql');
fs.writeFileSync(destPath, sql);
console.log('Successfully created updated v16 migration with 97 unique category images!');
