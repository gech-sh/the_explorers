export function parseMarsCoordinates(text){
  const match=String(text).trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if(!match)return null;
  const lat=Number(match[1]),longitude=Number(match[2]);
  if(!Number.isFinite(lat)||!Number.isFinite(longitude)||lat < -90||lat > 90||longitude < -180||longitude > 360)return null;
  return [lat,longitude>180?longitude-360:longitude];
}
export function searchPlaces(places,query){
  const needle=String(query).trim().toLowerCase();
  return places.filter(place=>!needle||place.name.toLowerCase().includes(needle))
    .sort((a,b)=>Number(b.name.toLowerCase().startsWith(needle))-Number(a.name.toLowerCase().startsWith(needle)))
    .slice(0,7);
}
export function resolveEndpoint(text,places,selection){
  const value=String(text).trim();
  if(selection&&selection.name===value)return {...selection,coords:[...selection.coords]};
  const matches=places.filter(place=>place.name.toLowerCase()===value.toLowerCase());
  if(matches.length===1)return {...matches[0],coords:[...matches[0].coords]};
  const coords=parseMarsCoordinates(value);
  if(coords)return {name:`${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,coords};
  throw new Error('Choose a suggested place or enter latitude, longitude.');
}
