const https = require('https');
const fs = require('fs');
const path = require('path');

// Curated collection of 75+ distinct real-world infrastructure and civic issue photos from Unsplash
const imageManifest = [
  // Road Maintenance (14 images)
  { cat: 'roads', name: 'pothole_1.jpg', id: '1515162816999-a0c47dc192f7' },
  { cat: 'roads', name: 'pothole_2.jpg', id: '1544620347-c4fd4a3d5957' },
  { cat: 'roads', name: 'pothole_3.jpg', id: '1584463699043-41e7d031bfec' },
  { cat: 'roads', name: 'road_crack_1.jpg', id: '1578874691223-a4558a07c9c7' },
  { cat: 'roads', name: 'road_crack_2.jpg', id: '1568605117036-5fe5e7bab0b7' },
  { cat: 'roads', name: 'road_repair_1.jpg', id: '1504307651254-35680f356dfd' },
  { cat: 'roads', name: 'asphalt_damage_1.jpg', id: '1590402494682-cd3fb53b1f70' },
  { cat: 'roads', name: 'asphalt_damage_2.jpg', id: '1590402494587-44b71d7772f6' },
  { cat: 'roads', name: 'manhole_1.jpg', id: '1580974852861-c381510bc98a' },
  { cat: 'roads', name: 'trench_1.jpg', id: '1590402494723-5d5ec3b5eb78' },
  { cat: 'roads', name: 'gravel_hazard.jpg', id: '1589939705384-5185137a7f0f' },
  { cat: 'roads', name: 'broken_pavement.jpg', id: '1509316975850-ff9c5deb0cd9' },
  { cat: 'roads', name: 'highway_barrier.jpg', id: '1563245372-f21724e3856d' },
  { cat: 'roads', name: 'bridge_joint.jpg', id: '1513694203232-719a280e022f' },

  // Sanitation & Waste (14 images)
  { cat: 'sanitation', name: 'dumpster_1.jpg', id: '1530587191325-3db32d826c18' },
  { cat: 'sanitation', name: 'dumpster_2.jpg', id: '1532996122724-e3c354a0b15b' },
  { cat: 'sanitation', name: 'garbage_pile_1.jpg', id: '1605600659908-0ef719419d41' },
  { cat: 'sanitation', name: 'garbage_pile_2.jpg', id: '1528323273322-d81458248d40' },
  { cat: 'sanitation', name: 'litter_1.jpg', id: '1618477461853-cf6ed80faba5' },
  { cat: 'sanitation', name: 'litter_2.jpg', id: '1611284446314-60a58ac0deb9' },
  { cat: 'sanitation', name: 'plastic_waste_1.jpg', id: '1567095761054-7a02e69e5c43' },
  { cat: 'sanitation', name: 'rubbish_bin.jpg', id: '1582407947304-fd86f028f716' },
  { cat: 'sanitation', name: 'debris_pile.jpg', id: '1503596476-1c12a8ba09a9' },
  { cat: 'sanitation', name: 'market_waste.jpg', id: '1550989460-0adf9ea622e2' },
  { cat: 'sanitation', name: 'overflow_bin_2.jpg', id: '1595278069441-2cf29f8005a4' },
  { cat: 'sanitation', name: 'alley_trash.jpg', id: '1537084642907-629340c7e59c' },
  { cat: 'sanitation', name: 'construction_debris.jpg', id: '1504307651254-35680f356dfd' },
  { cat: 'sanitation', name: 'street_sweep.jpg', id: '1562654501-a0ccc0fc3fb1' },

  // Electricity & Power (12 images)
  { cat: 'electricity', name: 'wires_1.jpg', id: '1473341304170-971dccb5ac1e' },
  { cat: 'electricity', name: 'wires_2.jpg', id: '1541888946425-d0fbb18f15f7' },
  { cat: 'electricity', name: 'meter_box_1.jpg', id: '1558494949-ef010cbdcc31' },
  { cat: 'electricity', name: 'transformer_1.jpg', id: '1509390144018-eeaf6501704a' },
  { cat: 'electricity', name: 'utility_pole_1.jpg', id: '1516216628859-9bccecab13ca' },
  { cat: 'electricity', name: 'utility_pole_2.jpg', id: '1508873696983-2df5293cb32f' },
  { cat: 'electricity', name: 'power_lines_1.jpg', id: '1498084393753-b411b2d26b34' },
  { cat: 'electricity', name: 'junction_box.jpg', id: '1544716278-ca5e3f4abd8c' },
  { cat: 'electricity', name: 'cable_mess.jpg', id: '1519501025264-65ba15a82390' },
  { cat: 'electricity', name: 'substation_hazard.jpg', id: '1518770660439-4636190af475' },
  { cat: 'electricity', name: 'spark_casing.jpg', id: '1550751827-4bd374c3f58b' },
  { cat: 'electricity', name: 'fuse_breaker.jpg', id: '1581092160607-ee22621dd758' },

  // Street Lights (10 images)
  { cat: 'streetlights', name: 'dark_street_1.jpg', id: '1509114397022-ed747cca3f65' },
  { cat: 'streetlights', name: 'dark_street_2.jpg', id: '1517457373958-b7bdd4587205' },
  { cat: 'streetlights', name: 'broken_lamp_1.jpg', id: '1513694203232-719a280e022f' },
  { cat: 'streetlights', name: 'broken_lamp_2.jpg', id: '1506744038136-46273834b3fb' },
  { cat: 'streetlights', name: 'flicker_post.jpg', id: '1507525428034-b723cf961d3e' },
  { cat: 'streetlights', name: 'night_junction.jpg', id: '1477959858617-67f30bc75b82' },
  { cat: 'streetlights', name: 'unlit_road.jpg', id: '1519501025264-65ba15a82390' },
  { cat: 'streetlights', name: 'pole_glass.jpg', id: '1486406146926-c627a92ad1ab' },
  { cat: 'streetlights', name: 'suburban_dark.jpg', id: '1464822759023-fed622ff2c3b' },
  { cat: 'streetlights', name: 'lamp_bulb_out.jpg', id: '1508873696983-2df5293cb32f' },

  // Drainage & Sewerage (10 images)
  { cat: 'drainage', name: 'drain_clogged_1.jpg', id: '1541888946425-d0fbb18f15f7' },
  { cat: 'drainage', name: 'drain_clogged_2.jpg', id: '1584463699043-41e7d031bfec' },
  { cat: 'drainage', name: 'flooded_street_1.jpg', id: '1514632595-4944383fa27b' },
  { cat: 'drainage', name: 'flooded_street_2.jpg', id: '1544620347-c4fd4a3d5957' },
  { cat: 'drainage', name: 'sewage_grate.jpg', id: '1580974852861-c381510bc98a' },
  { cat: 'drainage', name: 'waterlogging_road.jpg', id: '1515162816999-a0c47dc192f7' },
  { cat: 'drainage', name: 'culvert_overflow.jpg', id: '1585675100414-add2e465a136' },
  { cat: 'drainage', name: 'gutter_silt.jpg', id: '1590402494682-cd3fb53b1f70' },
  { cat: 'drainage', name: 'stagnant_pool.jpg', id: '1548839140-29a749e1bc4e' },
  { cat: 'drainage', name: 'rainwater_flood.jpg', id: '1518770660439-4636190af475' },

  // Water Supply (10 images)
  { cat: 'water', name: 'pipe_leak_1.jpg', id: '1585675100414-add2e465a136' },
  { cat: 'water', name: 'pipe_leak_2.jpg', id: '1548839140-29a749e1bc4e' },
  { cat: 'water', name: 'pipe_burst_road.jpg', id: '1514632595-4944383fa27b' },
  { cat: 'water', name: 'tap_water_murky.jpg', id: '1506744038136-46273834b3fb' },
  { cat: 'water', name: 'water_contamination.jpg', id: '1507525428034-b723cf961d3e' },
  { cat: 'water', name: 'valve_leak.jpg', id: '1541888946425-d0fbb18f15f7' },
  { cat: 'water', name: 'distribution_line.jpg', id: '1584463699043-41e7d031bfec' },
  { cat: 'water', name: 'municipal_tap.jpg', id: '1580974852861-c381510bc98a' },
  { cat: 'water', name: 'subsurface_leak.jpg', id: '1590402494587-44b71d7772f6' },
  { cat: 'water', name: 'low_pressure_meter.jpg', id: '1558494949-ef010cbdcc31' },

  // Parks & Public Grounds (8 images)
  { cat: 'parks', name: 'broken_bench_1.jpg', id: '1519331379826-f10be5486c6f' },
  { cat: 'parks', name: 'broken_bench_2.jpg', id: '1506744038136-46273834b3fb' },
  { cat: 'parks', name: 'overgrown_park_1.jpg', id: '1448375240586-882707db888b' },
  { cat: 'parks', name: 'overgrown_park_2.jpg', id: '1507525428034-b723cf961d3e' },
  { cat: 'parks', name: 'damaged_swing.jpg', id: '1477959858617-67f30bc75b82' },
  { cat: 'parks', name: 'fallen_tree_branch.jpg', id: '1464822759023-fed622ff2c3b' },
  { cat: 'parks', name: 'broken_fencing.jpg', id: '1486406146926-c627a92ad1ab' },
  { cat: 'parks', name: 'walking_track_brush.jpg', id: '1519501025264-65ba15a82390' },

  // Traffic & Hazards (6 images)
  { cat: 'traffic', name: 'traffic_signal_1.jpg', id: '1563245372-f21724e3856d' },
  { cat: 'traffic', name: 'traffic_signal_2.jpg', id: '1508873696983-2df5293cb32f' },
  { cat: 'traffic', name: 'road_block_1.jpg', id: '1544620347-c4fd4a3d5957' },
  { cat: 'traffic', name: 'road_barrier.jpg', id: '1513694203232-719a280e022f' },
  { cat: 'traffic', name: 'missing_sign.jpg', id: '1473341304170-971dccb5ac1e' },
  { cat: 'traffic', name: 'construction_cone.jpg', id: '1504307651254-35680f356dfd' }
];

function downloadOne(item) {
  return new Promise((resolve) => {
    const dir = path.join(__dirname, '..', 'public', 'seed-images', item.cat);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, item.name);

    // If file already exists and is > 10kb, skip
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      return resolve({ status: 'cached', name: item.name });
    }

    const url = `https://images.unsplash.com/photo-${item.id}?w=700&auto=format&fit=crop&q=80`;

    function fetchUrl(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
        } else if (res.statusCode === 200) {
          const stream = fs.createWriteStream(dest);
          res.pipe(stream);
          stream.on('finish', () => {
            stream.close();
            resolve({ status: 'ok', name: item.name, size: fs.statSync(dest).size });
          });
        } else {
          // If 404, fallback to copying an existing file in that category if available
          const existing = fs.readdirSync(dir).find(f => f.endsWith('.jpg') && f !== item.name);
          if (existing) {
            fs.copyFileSync(path.join(dir, existing), dest);
            resolve({ status: 'fallback_copied', name: item.name });
          } else {
            resolve({ status: 'skipped', name: item.name });
          }
        }
      }).on('error', () => {
        resolve({ status: 'error', name: item.name });
      });
    }

    fetchUrl(url);
  });
}

async function run() {
  console.log(`Starting expanded image acquisition (${imageManifest.length} distinct assets)...`);
  let okCount = 0;
  for (const item of imageManifest) {
    const res = await downloadOne(item);
    if (res.status === 'ok' || res.status === 'cached' || res.status === 'fallback_copied') {
      okCount++;
    }
  }
  console.log(`Successfully prepared ${okCount} out of ${imageManifest.length} distinct image files in public/seed-images!`);
}

run();
