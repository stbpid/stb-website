// Script to fetch Philippine region GeoJSON files from faeldon/philippines-json-maps
// and convert them to a single SVG with one path per region.

import https from 'https';
import { writeFileSync } from 'fs';

const BASE = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/';

// PSGC region codes -> region names
const REGIONS = [
  { code: '100000000', id: 'region-1',    name: 'Region I (Ilocos Region)',           dataRegion: 'Region I' },
  { code: '200000000', id: 'region-2',    name: 'Region II (Cagayan Valley)',          dataRegion: 'Region II' },
  { code: '300000000', id: 'region-3',    name: 'Region III (Central Luzon)',          dataRegion: 'Region III' },
  { code: '400000000', id: 'region-4a',   name: 'Region IV-A (CALABARZON)',            dataRegion: 'Region IV-A' },
  { code: '1700000000', id: 'region-4b',  name: 'Region IV-B (MIMAROPA)',              dataRegion: 'Region IV-B' },
  { code: '500000000', id: 'region-5',    name: 'Region V (Bicol Region)',             dataRegion: 'Region V' },
  { code: '600000000', id: 'region-6',    name: 'Region VI (Western Visayas)',         dataRegion: 'Region VI' },
  { code: '700000000', id: 'region-7',    name: 'Region VII (Central Visayas)',        dataRegion: 'Region VII' },
  { code: '800000000', id: 'region-8',    name: 'Region VIII (Eastern Visayas)',       dataRegion: 'Region VIII' },
  { code: '900000000', id: 'region-9',    name: 'Region IX (Zamboanga Peninsula)',     dataRegion: 'Region IX' },
  { code: '1000000000', id: 'region-10',  name: 'Region X (Northern Mindanao)',        dataRegion: 'Region X' },
  { code: '1100000000', id: 'region-11',  name: 'Region XI (Davao Region)',            dataRegion: 'Region XI' },
  { code: '1200000000', id: 'region-12',  name: 'Region XII (SOCCSKSARGEN)',           dataRegion: 'Region XII' },
  { code: '1300000000', id: 'ncr',        name: 'NCR (National Capital Region)',       dataRegion: 'NCR' },
  { code: '1400000000', id: 'car',        name: 'CAR (Cordillera Administrative Region)', dataRegion: 'CAR' },
  { code: '1600000000', id: 'region-13',  name: 'Region XIII (CARAGA)',                dataRegion: 'Region XIII' },
  { code: '1900000000', id: 'barmm',      name: 'BARMM',                               dataRegion: 'BARMM' },
];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Collect all coordinate bounds across all regions first, then project
function collectAllCoords(allFeatures) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

  function processCoords(coords) {
    for (const c of coords) {
      if (Array.isArray(c[0])) {
        processCoords(c);
      } else {
        const [lon, lat] = c;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  for (const { features } of allFeatures) {
    for (const f of features) {
      processCoords(f.geometry.coordinates);
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

// Project lon/lat to SVG coordinates with some padding
function makeProjector(minLon, maxLon, minLat, maxLat, svgW, svgH, padding = 10) {
  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;

  // Maintain aspect ratio
  const scaleX = (svgW - 2 * padding) / lonRange;
  const scaleY = (svgH - 2 * padding) / latRange;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (svgW - 2 * padding - lonRange * scale) / 2;
  const offsetY = padding + (svgH - 2 * padding - latRange * scale) / 2;

  return (lon, lat) => {
    const x = offsetX + (lon - minLon) * scale;
    const y = offsetY + (maxLat - lat) * scale; // flip Y
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };
}

// Convert GeoJSON geometry to SVG path d string
function geomToPath(geometry, project) {
  function ringToPath(ring) {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(ring[i][0], ring[i][1]);
      d += (i === 0 ? 'M' : 'L') + x + ',' + y;
    }
    return d + 'Z';
  }

  function processPolygon(coords) {
    return coords.map(ringToPath).join('');
  }

  if (geometry.type === 'Polygon') {
    return processPolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(processPolygon).join('');
  }
  return '';
}

async function main() {
  console.log('Fetching GeoJSON for all 17 regions...');

  const allData = [];
  for (const region of REGIONS) {
    const url = `${BASE}provdists-region-${region.code}.0.001.json`;
    console.log(`  Fetching Region ${region.dataRegion}...`);
    try {
      const raw = await fetchURL(url);
      const json = JSON.parse(raw);
      allData.push({ region, features: json.features });
    } catch (e) {
      console.error(`  ERROR for ${region.dataRegion}: ${e.message}`);
      allData.push({ region, features: [] });
    }
  }

  console.log('Computing bounds...');
  const { minLon, maxLon, minLat, maxLat } = collectAllCoords(allData);
  console.log(`Bounds: lon [${minLon}, ${maxLon}], lat [${minLat}, ${maxLat}]`);

  const SVG_W = 500;
  const SVG_H = 780;
  const project = makeProjector(minLon, maxLon, minLat, maxLat, SVG_W, SVG_H, 12);

  console.log('Generating SVG...');

  // Merge all province features per region into one path
  const pathElements = [];
  for (const { region, features } of allData) {
    if (features.length === 0) {
      console.warn(`  No features for ${region.dataRegion}`);
      continue;
    }

    // Combine all province paths for this region into one <path>
    let combinedD = '';
    for (const feature of features) {
      combinedD += geomToPath(feature.geometry, project);
    }

    pathElements.push(
      `  <path id="${region.id}" data-region="${region.dataRegion}" ` +
      `title="${region.name}" d="${combinedD}"/>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">
  <!-- Philippine Administrative Regions SVG Map -->
  <!-- Source: faeldon/philippines-json-maps (GeoJSON) — converted to SVG paths -->
  <!-- License: Original data from PSA/NAMRIA. Map data CC BY 4.0 -->
  <style>
    path { fill: #c8e6c9; stroke: #ffffff; stroke-width: 0.5; }
    path:hover { fill: #66bb6a; cursor: pointer; }
    path#ncr { fill: #a5d6a7; }
  </style>
${pathElements.join('\n')}
</svg>`;

  writeFileSync('images/philippines-regions.svg', svg);
  console.log('Done! Written to images/philippines-regions.svg');
  console.log(`Total regions with paths: ${pathElements.length}/17`);
}

main().catch(console.error);
