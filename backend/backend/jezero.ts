import grid from '../data/processed/jezero.json';
import { lonLatToGrid,gridToLonLat,type Coord } from '../shared/projection';
import { ApiError } from './api-error';
export const jezeroGrid={...grid,dtm_id:grid.id,source_url:'https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms'};
export const jezeroInfo={id:grid.id,name:'Jezero western delta and landing sector',center:grid.center,resolution_m:grid.cell_m,
  width_m:grid.width_m,height_m:grid.height_m,valid_percent:grid.valid_percent,home:grid.home,sites:grid.sites,
  bounds:[[-.5,-.5],[grid.cols-.5,-.5],[grid.cols-.5,grid.rows-.5],[-.5,grid.rows-.5]].map(point=>gridToLonLat(grid,point as Coord)),
  source_url:jezeroGrid.source_url,note:'Prepared Jezero HiRISE elevation grid. No-data cells are excluded. Routing is restricted to its actual coverage.'};
export function identifyJezero(coordinate:Coord){
  const[x,y]=lonLatToGrid(grid,coordinate);
  if(x<0||y<0||x>=grid.cols||y>=grid.rows)throw new ApiError('OUTSIDE_COVERAGE','No loaded Jezero elevation data at this point.',422);
  const index=y*grid.cols+x,elevation=grid.elevations[index],slope=grid.slopes[index];
  const classification=elevation===null||slope===null?'unknown':slope>=10?'steep':slope>=3?'caution':'no_terrain_flag';
  return {coordinate,scope:'Jezero detail',resolution_m:grid.cell_m,elevation_m:elevation,slope_deg:slope,
    danger:{classification,basis:'Slope derived from the prepared Jezero elevation grid; missing terrain is excluded. This is a planning indicator, not a safety certification.'},source_dataset_id:grid.id,source_url:jezeroGrid.source_url};
}
