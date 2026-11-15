import { planningSettings,savePlanningSettings,conditionFor,originalHazards } from './planning-safety.js';
let lastState,currentRegion='arcadia',actions;
const el=id=>document.getElementById(id);
export function initSafetyPanel(callbacks){
  actions=callbacks;
  el('safety-slope-limit').value=String(planningSettings.maxSlope);el('safety-limit-value').textContent=planningSettings.maxSlope+' deg';
  el('show-measured-hazards').checked=planningSettings.measuredHazards;
  el('show-demo-hazards').checked=planningSettings.demoHazards;
  el('show-measured-hazards').addEventListener('change',event=>{savePlanningSettings({measuredHazards:event.target.checked});actions.overlays();});
  el('show-demo-hazards').addEventListener('change',event=>{
    savePlanningSettings({demoHazards:event.target.checked});actions.overlays();renderExamples();if(lastState)updateSafetyPanel(lastState);
  });
  el('safety-slope-limit').addEventListener('input',event=>{
    savePlanningSettings({maxSlope:Number(event.target.value)});el('safety-limit-value').textContent=planningSettings.maxSlope+' deg';
    el('safety-reset').setAttribute('aria-label','Reset slope limit to 5 degrees');
    if(lastState)updateSafetyPanel(lastState);el('safety-route-note').textContent='Rechecking route with the new slope limit...';actions.recompute();
  });
  el('safety-reset').addEventListener('click',()=>{savePlanningSettings({maxSlope:5});el('safety-slope-limit').value='5';el('safety-limit-value').textContent='5 deg';if(lastState)updateSafetyPanel(lastState);el('safety-route-note').textContent='Rechecking route with the new slope limit...';actions.recompute();});
  el('focus-measured-hazards').addEventListener('click',()=>actions.focus('measured'));
  el('focus-demo-hazards').addEventListener('click',()=>actions.focus('demo'));
  changeSafetyRegion(currentRegion);
}
export function changeSafetyRegion(region){
  currentRegion=region;
  el('measured-hazard-controls').hidden=region!=='arcadia';
  el('safety-route-rules').hidden=!['arcadia','jezero'].includes(region);
  lastState=null;el('safety-conditions').replaceChildren();
  el('safety-route-note').textContent='Choose or drag a waypoint to inspect its conditions.';
  renderExamples();
}
function renderExamples(){
  el('demo-hazard-actions').hidden=!planningSettings.demoHazards;
  const list=el('demo-hazard-list');list.replaceChildren();
  if(!planningSettings.demoHazards)return;
  for(const hazard of originalHazards(currentRegion)){
    const button=document.createElement('button');button.type='button';button.className='hazard-location';
    const title=document.createElement('span');title.textContent=hazard.name;
    const meta=document.createElement('small');meta.textContent=`Example ${hazard.slope} deg slope · ${(hazard.radius/1000).toFixed(1)} km zone`;
    button.append(title,meta);button.addEventListener('click',()=>actions.inspect(hazard));list.append(button);
  }
}
export function updateSafetyPanel(state){
  lastState=state;const list=el('safety-conditions');list.replaceChildren();
  for(const [label,point,audit]of [['A',state.pointA,state.auditA],['B',state.pointB,state.auditB]]){
    const condition=conditionFor(audit,point.coords,state.regionId);
    const card=document.createElement('article');card.className='condition-card';card.dataset.condition=condition.kind;
    const heading=document.createElement('strong');heading.textContent=`${label} · ${condition.label}`;
    const name=document.createElement('p');name.className='condition-location';name.textContent=point.name;
    const detail=document.createElement('p');detail.textContent=condition.detail;
    card.append(heading,name,detail);list.append(card);
  }
  const route=state.routeData;
  el('safety-route-note').textContent=route.available
    ? `Route peak ${route.raw.metrics.max_slope_deg} deg / limit ${planningSettings.maxSlope} deg. `+(route.kind==='regional_concept_route'?'Regional concept route; not validated for travel.':'Measured-grid route; site safety still needs review.')
    : 'No measured route for these endpoints under the selected slope limit.';
}
