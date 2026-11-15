import datasets from '../data/processed/datasets.json';
import ar from '../data/ar/catalog.json';
import { GRID, SITES } from './terrain';
export const unifiedArcadia = {
  id: 'arcadia-unified-v1', name: 'Arcadia',
  sources: [...datasets.items.map(item=>({...item, coverage:'measured-routing-sector'})), ...ar.datasets.map(item=>({...item,coverage:'ar-supplied-footprint'}))],
  sites: [...SITES.map(site=>({...site,source_group:'measured',routing_available:true})),...ar.sites.map(site=>({...site,source_group:'ar',routing_available:false}))],
  coverage: {routing_region:GRID.id,ar_region:ar.region,ar_optical_bounds:ar.optical.bounds},
  notes: ar.warnings,
  explanation:'Unified catalog and map workspace. Source coordinates and their actual coverage are preserved; AR does not include an elevation grid.'
};
