const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  // Road Maintenance
  { category: 'roads', name: 'pothole_1.jpg', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80' },
  { category: 'roads', name: 'pothole_2.jpg', url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&auto=format&fit=crop&q=80' },
  { category: 'roads', name: 'road_crack.jpg', url: 'https://images.unsplash.com/photo-1578874691223-a4558a07c9c7?w=700&auto=format&fit=crop&q=80' },

  // Sanitation & Waste
  { category: 'sanitation', name: 'dumpster_1.jpg', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=700&auto=format&fit=crop&q=80' },
  { category: 'sanitation', name: 'garbage_pile.jpg', url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=700&auto=format&fit=crop&q=80' },
  { category: 'sanitation', name: 'litter_1.jpg', url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=700&auto=format&fit=crop&q=80' },

  // Electricity
  { category: 'electricity', name: 'wires_1.jpg', url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=700&auto=format&fit=crop&q=80' },
  { category: 'electricity', name: 'transformer_1.jpg', url: 'https://images.unsplash.com/photo-1509390144018-eeaf6501704a?w=700&auto=format&fit=crop&q=80' },
  { category: 'electricity', name: 'meter_box.jpg', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=700&auto=format&fit=crop&q=80' },

  // Street Lights
  { category: 'streetlights', name: 'dark_street.jpg', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=700&auto=format&fit=crop&q=80' },
  { category: 'streetlights', name: 'broken_lamp.jpg', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=700&auto=format&fit=crop&q=80' },

  // Drainage
  { category: 'drainage', name: 'drain_clogged.jpg', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=700&auto=format&fit=crop&q=80' },
  { category: 'drainage', name: 'flooded_street.jpg', url: 'https://images.unsplash.com/photo-1514632595-4944383fa27b?w=700&auto=format&fit=crop&q=80' },

  // Water Supply
  { category: 'water', name: 'pipe_leak.jpg', url: 'https://images.unsplash.com/photo-1585675100414-add2e465a136?w=700&auto=format&fit=crop&q=80' },
  { category: 'water', name: 'tap_water.jpg', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=700&auto=format&fit=crop&q=80' },

  // Parks
  { category: 'parks', name: 'broken_bench.jpg', url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=700&auto=format&fit=crop&q=80' },
  { category: 'parks', name: 'overgrown_park.jpg', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=700&auto=format&fit=crop&q=80' },

  // Traffic
  { category: 'traffic', name: 'traffic_signal.jpg', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&auto=format&fit=crop&q=80' },
  { category: 'traffic', name: 'road_block.jpg', url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&auto=format&fit=crop&q=80' }
];

function downloadFile(item) {
  return new Promise((resolve, reject) => {
    const dir = path.join(__dirname, '..', 'public', 'seed-images', item.category);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, item.name);

    function fetchUrl(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
        } else if (res.statusCode === 200) {
          const stream = fs.createWriteStream(dest);
          res.pipe(stream);
          stream.on('finish', () => {
            stream.close();
            console.log(`[OK] Downloaded: ${item.category}/${item.name} (${fs.statSync(dest).size} bytes)`);
            resolve();
          });
        } else {
          console.error(`Failed ${item.name}: status ${res.statusCode}`);
          resolve(); // don't fail entire batch
        }
      }).on('error', (err) => {
        console.error(`Error ${item.name}:`, err.message);
        resolve();
      });
    }

    fetchUrl(item.url);
  });
}

async function run() {
  console.log(`Starting download of ${images.length} realistic civic photos...`);
  for (const img of images) {
    await downloadFile(img);
  }
  console.log('All image assets successfully downloaded into public/seed-images!');
}

run();
