// Original frontend planning examples. These are illustrative, unverified scenarios.
export const ORIGINAL_PLANNING={
  "arcadia": {
    "hazards": [
      {
        "id": "crater_east",
        "name": "East Impact Crater Rim",
        "lat": 39.18,
        "lng": -169.95,
        "radius": 13500,
        "slope": 7.2,
        "elev": -3620,
        "desc": "Steep impact crater rim with boulder scree (>5° slope hazard)"
      },
      {
        "id": "crater_west",
        "name": "West Impact Crater Rim",
        "lat": 39.38,
        "lng": -170.82,
        "radius": 8500,
        "slope": 6.5,
        "elev": -3710,
        "desc": "Impact crater flank with loose ejecta scree (>5° slope hazard)"
      },
      {
        "id": "ridge_south",
        "name": "Southwest Escarpment Ridge",
        "lat": 38.65,
        "lng": -170.8,
        "radius": 11000,
        "slope": 5.6,
        "elev": -3550,
        "desc": "Tectonic fault scarp with steep rubble"
      }
    ],
    "scenarios": [
      {
        "key": "safe_plain",
        "label": "✓ Flat Plain (Safe)",
        "cls": "bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300",
        "a": {
          "name": "Central Base Habitat",
          "coords": [
            39.2,
            -170.3
          ]
        },
        "b": {
          "name": "Ice Mine Trench A",
          "coords": [
            39.36,
            -170.52
          ]
        }
      },
      {
        "key": "crater_hazard",
        "label": "✗ Crater Rim (Hazard)",
        "cls": "bg-rose-950/30 hover:bg-rose-900/50 border-rose-600/50 text-rose-300",
        "a": {
          "name": "Central Base Habitat",
          "coords": [
            39.2,
            -170.3
          ]
        },
        "b": {
          "name": "East Crater Rim Ridge",
          "coords": [
            39.18,
            -169.95
          ]
        }
      },
      {
        "key": "ejecta_caution",
        "label": "⚠ Ejecta (Caution)",
        "cls": "bg-amber-950/30 hover:bg-amber-900/50 border-amber-600/50 text-amber-300",
        "a": {
          "name": "Central Base Habitat",
          "coords": [
            39.2,
            -170.3
          ]
        },
        "b": {
          "name": "East Ejecta Blanket",
          "coords": [
            39.22,
            -169.75
          ]
        }
      },
      {
        "key": "hazard_detour",
        "label": "🛡 Detour Route",
        "cls": "bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-600/50 text-cyan-300",
        "a": {
          "name": "Central Base Habitat",
          "coords": [
            39.2,
            -170.4
          ]
        },
        "b": {
          "name": "East Research Station",
          "coords": [
            39.18,
            -169.58
          ]
        }
      }
    ]
  },
  "jezero": {
    "hazards": [
      {
        "id": "belva_crater",
        "name": "Belva Impact Crater Rim",
        "lat": 18.482,
        "lng": 77.398,
        "radius": 1100,
        "slope": 12.5,
        "elev": -2390,
        "desc": "Steep crater wall & exposed layered delta boulders (>5°)"
      },
      {
        "id": "seitah_dunes",
        "name": "Séítah Aeolian Sand Ripples",
        "lat": 18.425,
        "lng": 77.425,
        "radius": 1300,
        "slope": 6.8,
        "elev": -2545,
        "desc": "High-slippage sand bedforms requiring AutoNav avoidance"
      },
      {
        "id": "jezero_rim",
        "name": "Western Jezero Crater Rim",
        "lat": 18.5,
        "lng": 77.31,
        "radius": 2800,
        "slope": 15.2,
        "elev": -1950,
        "desc": "Steep western rim ascent (>15° incline)"
      }
    ],
    "scenarios": [
      {
        "key": "oeb_to_delta",
        "label": "✓ OEB → Neretva Vallis",
        "cls": "bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-600/50 text-emerald-300",
        "a": {
          "name": "Octavia E. Butler Landing",
          "coords": [
            18.4447,
            77.4508
          ]
        },
        "b": {
          "name": "Neretva Vallis",
          "coords": [
            18.485,
            77.362
          ]
        }
      },
      {
        "key": "three_forks",
        "label": "🧪 Three Forks Depot",
        "cls": "bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-600/50 text-cyan-300",
        "a": {
          "name": "Octavia E. Butler Landing",
          "coords": [
            18.4447,
            77.4508
          ]
        },
        "b": {
          "name": "Three Forks Sample Depot",
          "coords": [
            18.461,
            77.405
          ]
        }
      },
      {
        "key": "belva_hazard",
        "label": "✗ Belva Rim (Hazard)",
        "cls": "bg-rose-950/30 hover:bg-rose-900/50 border-rose-600/50 text-rose-300",
        "a": {
          "name": "Three Forks Depot",
          "coords": [
            18.461,
            77.405
          ]
        },
        "b": {
          "name": "Belva Crater Wall",
          "coords": [
            18.482,
            77.398
          ]
        }
      },
      {
        "key": "seitah_detour",
        "label": "🛡 Séítah Sand Detour",
        "cls": "bg-amber-950/30 hover:bg-amber-900/50 border-amber-600/50 text-amber-300",
        "a": {
          "name": "South Jezero Camp",
          "coords": [
            18.41,
            77.45
          ]
        },
        "b": {
          "name": "Delta Front",
          "coords": [
            18.458,
            77.392
          ]
        }
      }
    ]
  }
};
