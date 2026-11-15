export function marswalkInput(form,tasks){
  const name=String(form.name||'').trim();
  if(!name||name.length>80)throw new Error('Give the Marswalk a name of 1–80 characters.');
  if(!tasks.length)throw new Error('Select at least one science stop.');
  const positive=(value,min,max,label)=>{const number=Number(value);if(!Number.isFinite(number)||number<min||number>max)throw new Error(label+' is outside its supported range.');return number;};
  const crew=positive(form.crew,1,4,'Crew size');if(!Number.isInteger(crew))throw new Error('Crew size must be a whole number.');
  const equipment=String(form.equipment||'').trim(),notes=String(form.notes||'').trim();
  if(equipment.length>500||notes.length>3000)throw new Error('Shorten the equipment or notes text.');
  return {name,crew_count:crew,equipment,notes,model_local_hour:positive(form.modelHour??12,0,24,'Model reference hour'),site_ids:tasks.map(task=>task.id),
    observation_tasks:tasks.map(task=>{const objective=String(task.objective||'').trim();if(!objective||objective.length>500)throw new Error('Each stop needs an objective of 1–500 characters.');const duration=positive(task.minutes,1,60,'Science time');if(!Number.isInteger(duration))throw new Error('Set science time in whole minutes.');return {site_id:task.id,objective,dwell_time_s:duration*60};}),
    return_to_start:Boolean(form.returnToStart),
    constraints:{max_slope_deg:positive(form.slope,1,30,'Slope limit'),max_distance_m:positive(form.distanceKm,.1,30,'Distance budget')*1000,
      max_duration_s:positive(form.durationHours,1/6,12,'Time budget')*3600,walking_speed_m_s:positive(form.speedKmH,.36,5.4,'Walking speed')/3.6}};
}
export function scienceRouteForMap(route){
  return {available:true,kind:'science_marswalk',resolution_m:20,routePoints:route.geometry.coordinates.map(([lon,lat])=>[lat,lon]),
    totalTraverseKm:route.metrics.distance_m/1000,timeString:Math.round(route.metrics.total_duration_s/60)+' min',
    message:'Science time and walking included. '+route.warnings.join(' '),isDetour:false,
    raw:{...route,steps:route.itinerary.map(leg=>({instruction:leg.from+' → '+leg.to,distance_m:leg.distance_m,duration_s:leg.walking_duration_s}))}};
}
export function briefingSnapshot(input,route,climate,hour,sources=[]){
  return {briefing_version:'marswalk-1',mission:structuredClone(input),route:structuredClone(route),
    evidence:{data_types:[...new Set(sources.map(source=>source.data_type))],source_records:structuredClone(sources),
      use:'Topography constrains routing; optical and thermal imagery provide visual science context. Thermal image brightness is not a temperature measurement.'},
    environment:climate?{source:climate.source,live:false,season:climate.season,solar_longitude_deg:climate.solar_longitude_deg,
      coordinate:climate.coordinate,sample:climate.samples.find(sample=>sample.local_hour===hour),source_url:climate.request_url,retrieved_at:climate.retrieved_at,source_sha256:climate.source_sha256}:null,
    limitations:['Research-planning prototype; not certified for astronaut operations.','Route time uses constant walking speed plus science stops; suit performance, load and fatigue are not modeled.','Radiation monitoring, current weather and sub-grid rock/sand trafficability are not loaded.','Arcadia targets and staging point are proposed, not landed mission positions.']};
}
