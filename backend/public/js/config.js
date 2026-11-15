export const API_CONFIG = {
  useBackend: true, // Set to true when your backend team gives you the server URL
  backendBaseUrl: "/api/v1"
};

export const KM_PER_DEG_LAT = 59.16;

export const REGIONS = {
  arcadia: {
    id: "arcadia",
    title: "Arcadia Planitia • Tactical Landing Safety & Route Planner",
    tag: "ARCADIA",
    gridLabel: "100 KM GRID",
    scaleTicks: ["0km", "25km", "50km", "75km", "100km"],
    center: [39.2000, -170.3000],
    halfLat: 0.845,
    halfLng: 1.0905,
    defaultZoom: 7,
    pointA: { name: "Central Base Habitat", coords: [39.2000, -170.3000] },
    pointB: { name: "Ice Mine Trench A", coords: [39.3600, -170.5200] },
    iceLabel: "ICE",
    baseElev: -3940,
    hazards: [
      { id: "crater_east", name: "East Impact Crater Rim", lat: 39.18, lng: -169.95, radius: 13500, slope: 7.2, elev: -3620, desc: "Steep impact crater rim with boulder scree (>5° slope hazard)" },
      { id: "crater_west", name: "West Impact Crater Rim", lat: 39.38, lng: -170.82, radius: 8500, slope: 6.5, elev: -3710, desc: "Impact crater flank with loose ejecta scree (>5° slope hazard)" },
      { id: "ridge_south", name: "Southwest Escarpment Ridge", lat: 38.65, lng: -170.80, radius: 11000, slope: 5.6, elev: -3550, desc: "Tectonic fault scarp with steep rubble" }
    ],
    iceDeposits: [
      { lat: 39.45, lng: -170.65, radius: 18000, name: "SWIM Deep Sheet Alpha", depth: "0.45m" },
      { lat: 39.05, lng: -170.10, radius: 20000, name: "SWIM Tabular Permafrost Beta", depth: "0.58m" },
      { lat: 39.65, lng: -169.90, radius: 16000, name: "HiRISE Polygonal Sector", depth: "0.32m" }
    ],
    scenarios: [
      { key: "safe_plain", label: "✓ Flat Plain (Safe)", cls: "bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300", a: { name: "Central Base Habitat", coords: [39.200, -170.300] }, b: { name: "Ice Mine Trench A", coords: [39.360, -170.520] } },
      { key: "crater_hazard", label: "✗ Crater Rim (Hazard)", cls: "bg-rose-950/30 hover:bg-rose-900/50 border-rose-600/50 text-rose-300", a: { name: "Central Base Habitat", coords: [39.200, -170.300] }, b: { name: "East Crater Rim Ridge", coords: [39.180, -169.950] } },
      { key: "ejecta_caution", label: "⚠ Ejecta (Caution)", cls: "bg-amber-950/30 hover:bg-amber-900/50 border-amber-600/50 text-amber-300", a: { name: "Central Base Habitat", coords: [39.200, -170.300] }, b: { name: "East Ejecta Blanket", coords: [39.220, -169.750] } },
      { key: "hazard_detour", label: "🛡 Detour Route", cls: "bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-600/50 text-cyan-300", a: { name: "Central Base Habitat", coords: [39.200, -170.400] }, b: { name: "East Research Station", coords: [39.180, -169.580] } }
    ]
  },

  gale: {
    id: "gale",
    title: "Gale Crater • Curiosity Proposed Path Up Mount Sharp",
    tag: "GALE / MSL",
    gridLabel: "40 KM GALE SECTOR",
    scaleTicks: ["0km", "10km", "20km", "30km", "40km"],
    center: [-4.7200, 137.4200],
    halfLat: 0.34,
    halfLng: 0.34,
    defaultZoom: 9,
    pointA: { name: "Bradbury Landing (MSL)", coords: [-4.5895, 137.4417] },
    pointB: { name: "Lower Mount Sharp Target", coords: [-4.8250, 137.4480] },
    iceLabel: "STRATA",
    baseElev: -4500,
    hazards: [
      { id: "bagnold_dunes", name: "Bagnold Dark Sand Dunes", lat: -4.675, lng: 137.402, radius: 2200, slope: 9.4, elev: -4410, desc: "Active basaltic sand dunes — rover wheel slip risk (>5°)" },
      { id: "gediz_scarp", name: "Gediz Vallis Steep Scarp", lat: -4.778, lng: 137.392, radius: 1900, slope: 11.2, elev: -3850, desc: "Steep eroded sulfate ridge & boulder debris fan" },
      { id: "aeolis_peak", name: "Upper Aeolis Mons Slope", lat: -4.920, lng: 137.490, radius: 5500, slope: 14.0, elev: -2200, desc: "High-relief central peak slopes" }
    ],
    iceDeposits: [
      { lat: -4.745, lng: 137.398, radius: 2400, name: "Glen Torridon Clay Unit", depth: "Phyllosilicates" },
      { lat: -4.768, lng: 137.412, radius: 2200, name: "Sulfate-Bearing Transition", depth: "Hydrated Sulfates" }
    ],
    scenarios: [
      { key: "msl_ascent", label: "🧗 Full Mt. Sharp Climb", cls: "bg-amber-950/30 hover:bg-amber-900/50 border-amber-500/50 text-amber-300", a: { name: "Bradbury Landing", coords: [-4.5895, 137.4417] }, b: { name: "Lower Mount Sharp", coords: [-4.8250, 137.4480] } },
      { key: "pahrump_vrr", label: "🪨 Pahrump → V. Rubin", cls: "bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300", a: { name: "Pahrump Hills", coords: [-4.6630, 137.3770] }, b: { name: "Vera Rubin Ridge", coords: [-4.7280, 137.3860] } },
      { key: "bagnold_risk", label: "✗ Bagnold Dune Trap", cls: "bg-rose-950/30 hover:bg-rose-900/50 border-rose-600/50 text-rose-300", a: { name: "Yellowknife Bay", coords: [-4.5900, 137.4500] }, b: { name: "Bagnold Dunes Core", coords: [-4.6750, 137.4020] } },
      { key: "gediz_detour", label: "🛡 Gediz Vallis Detour", cls: "bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-600/50 text-cyan-300", a: { name: "Glen Torridon", coords: [-4.7450, 137.3980] }, b: { name: "Lower Mt. Sharp Camp", coords: [-4.8250, 137.4480] } }
    ]
  },

  jezero: {
    id: "jezero",
    title: "Jezero Crater • Mars 2020 Perseverance & HiRISE 25cm Planner",
    tag: "JEZERO / M2020",
    gridLabel: "30 KM JEZERO SECTOR",
    scaleTicks: ["0km", "7.5km", "15km", "22.5km", "30km"],
    center: [18.4700, 77.4100],
    halfLat: 0.25,
    halfLng: 0.27,
    defaultZoom: 10,
    pointA: { name: "Octavia E. Butler Landing", coords: [18.4447, 77.4508] },
    pointB: { name: "Neretva Vallis / Bright Angel", coords: [18.4850, 77.3620] },
    iceLabel: "MINERAL",
    baseElev: -2520,
    hazards: [
      { id: "belva_crater", name: "Belva Impact Crater Rim", lat: 18.482, lng: 77.398, radius: 1100, slope: 12.5, elev: -2390, desc: "Steep crater wall & exposed layered delta boulders (>5°)" },
      { id: "seitah_dunes", name: "Séítah Aeolian Sand Ripples", lat: 18.425, lng: 77.425, radius: 1300, slope: 6.8, elev: -2545, desc: "High-slippage sand bedforms requiring AutoNav avoidance" },
      { id: "jezero_rim", name: "Western Jezero Crater Rim", lat: 18.500, lng: 77.310, radius: 2800, slope: 15.2, elev: -1950, desc: "Steep western rim ascent (>15° incline)" }
    ],
    iceDeposits: [
      { lat: 18.468, lng: 77.385, radius: 1800, name: "Western Fan Delta Clays", depth: "Mg/Fe Smectites" },
      { lat: 18.485, lng: 77.362, radius: 1600, name: "Margin Carbonate Unit", depth: "Carbonates" }
    ],
    scenarios: [
      { key: "oeb_to_delta", label: "✓ OEB → Neretva Vallis", cls: "bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300", a: { name: "Octavia E. Butler Landing", coords: [18.4447, 77.4508] }, b: { name: "Neretva Vallis", coords: [18.4850, 77.3620] } },
      { key: "three_forks", label: "🧪 Three Forks Depot", cls: "bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-600/50 text-cyan-300", a: { name: "Octavia E. Butler Landing", coords: [18.4447, 77.4508] }, b: { name: "Three Forks Sample Depot", coords: [18.4610, 77.4050] } },
      { key: "belva_hazard", label: "✗ Belva Rim (Hazard)", cls: "bg-rose-950/30 hover:bg-rose-900/50 border-rose-600/50 text-rose-300", a: { name: "Three Forks Depot", coords: [18.4610, 77.4050] }, b: { name: "Belva Crater Wall", coords: [18.4820, 77.3980] } },
      { key: "seitah_detour", label: "🛡 Séítah Sand Detour", cls: "bg-amber-950/30 hover:bg-amber-900/50 border-amber-600/50 text-amber-300", a: { name: "South Jezero Camp", coords: [18.4100, 77.4500] }, b: { name: "Delta Front", coords: [18.4580, 77.3920] } }
    ]
  }
};

export const CURIOSITY_WAYPOINTS = [
  { name: "1. Bradbury Landing", coords: [-4.5895, 137.4417], sol: "Sol 0 (Aug 2012)", note: "MSL Touchdown on Aeolis Palus" },
  { name: "2. Yellowknife Bay", coords: [-4.5900, 137.4500], sol: "Sol 125–320", note: "Ancient habitable freshwater lakebed mudstones" },
  { name: "3. Kimberley", coords: [-4.6220, 137.4050], sol: "Sol 580–630", note: "Fluvial-deltaic sandstone beds dipping toward Mount Sharp" },
  { name: "4. Pahrump Hills", coords: [-4.6630, 137.3770], sol: "Sol 753–930", note: "Basal entry point onto lower Mount Sharp" },
  { name: "5. Murray Buttes", coords: [-4.6950, 137.3720], sol: "Sol 1420–1480", note: "Safe crossing corridor south of Bagnold Dunes" },
  { name: "6. Vera Rubin Ridge", coords: [-4.7280, 137.3860], sol: "Sol 1800–2280", note: "Erosion-resistant hematite-bearing ridge" },
  { name: "7. Glen Torridon", coords: [-4.7450, 137.3980], sol: "Sol 2300–2800", note: "Clay-bearing trough rich in smectite phyllosilicates" },
  { name: "8. Marker Band / Sulfate Unit", coords: [-4.7680, 137.4120], sol: "Sol 3600–3900", note: "Clay-to-sulfate transition with wave ripples" },
  { name: "9. Gediz Vallis Ridge", coords: [-4.7880, 137.4250], sol: "Sol 4100+", note: "Debris-flow fan & sulfur-bearing rocks" },
  { name: "10. Proposed Ascent: Lower Mount Sharp", coords: [-4.8250, 137.4480], sol: "Strategic Target", note: "Proposed ascent route onto higher sulfate strata (PIA23179)" }
];

export const PERSEVERANCE_WAYPOINTS = [
  { name: "1. Octavia E. Butler Landing", coords: [18.4447, 77.4508], sol: "Sol 0 (Feb 2021)", note: "Mars 2020 Touchdown site" },
  { name: "2. Séítah Rim Overlook", coords: [18.4360, 77.4340], sol: "Sol 160–310", note: "Olivine-rich igneous cumulate bedrock" },
  { name: "3. Three Forks Sample Depot", coords: [18.4610, 77.4050], sol: "Sol 660–690", note: "10 backup sample tubes cached for Mars Sample Return" },
  { name: "4. Belva Crater Overlook", coords: [18.4780, 77.3940], sol: "Sol 780–805", note: "Exposed cross-section of Western Fan delta strata" },
  { name: "5. Neretva Vallis / Bright Angel", coords: [18.4850, 77.3620], sol: "Sol 1140–1250", note: "Ancient river inflow channel & mudstone outcrops" },
  { name: "6. Jezero Crater Rim Ascent", coords: [18.4980, 77.3260], sol: "Extended Mission", note: "Noachian megabreccia & crater rim campaign" }
];