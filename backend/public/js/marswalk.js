import { request } from './api.js';
import { terrainEngine } from './engine-client.js';
import { planningSettings } from './planning-safety.js';
import { marswalkInput,briefingSnapshot } from './marswalk-model.js';
const el=id=>document.getElementById(id);
const text=(id,value)=>{el(id).textContent=value;};
const minutes=seconds=>Math.round(seconds/60)+' min';
export async function createMarswalk(actions){
  let sites=[],tasks=[],sources=[],climate=null,result=null,input=null,savedId=null,savedRoute=null,revision=0;
  const note=(message,error=false)=>{text('marswalk-message',message);el('marswalk-message').dataset.error=String(error);};
  function invalidate(){++revision;result=null;input=null;savedId=null;savedRoute=null;el('marswalk-save').textContent='Save Marswalk';el('marswalk-result').hidden=true;for(const id of ['marswalk-save','marswalk-map','marswalk-export','marswalk-print'])el(id).disabled=true;note('Plan changed. Calculate the Marswalk to refresh its briefing.');}
  function selectedTasks(){return tasks.filter(task=>task.selected);}
  function renderTasks(){
    const container=el('science-stop-list');container.replaceChildren();
    for(const [index,task]of tasks.entries()){
      const row=document.createElement('article');row.className='science-stop';row.dataset.selected=String(task.selected);
      const top=document.createElement('div');top.className='science-stop-heading';
      const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=task.selected;
      const name=document.createElement('span');name.textContent=task.name;label.append(check,name);
      check.addEventListener('change',()=>{task.selected=check.checked;invalidate();renderTasks();});
      const controls=document.createElement('div');controls.className='stop-order';
      for(const [delta,symbol,title]of [[-1,'↑','Move earlier'],[1,'↓','Move later']]){
        const button=document.createElement('button');button.type='button';button.textContent=symbol;button.title=title+' '+task.name;button.setAttribute('aria-label',button.title);button.disabled=index+delta<0||index+delta>=tasks.length;
        button.addEventListener('click',()=>{[tasks[index],tasks[index+delta]]=[tasks[index+delta],tasks[index]];invalidate();renderTasks();});controls.append(button);
      }
      top.append(label,controls);row.append(top);
      if(task.selected){
        const objectiveLabel=document.createElement('label');objectiveLabel.className='science-field';objectiveLabel.textContent='Science objective';
        const objective=document.createElement('textarea');objective.value=task.objective;objective.maxLength=500;objective.rows=3;objective.addEventListener('input',()=>{task.objective=objective.value;invalidate();});objectiveLabel.append(objective);
        const dwellLabel=document.createElement('label');dwellLabel.className='science-dwell';dwellLabel.textContent='Observation time (minutes)';
        const dwell=document.createElement('input');dwell.type='number';dwell.min='1';dwell.max='60';dwell.step='1';dwell.value=String(task.minutes);dwell.addEventListener('input',()=>{task.minutes=Number(dwell.value);invalidate();});dwellLabel.append(dwell);
        const coordinate=document.createElement('small');coordinate.textContent=task.coordinate[1].toFixed(5)+', '+task.coordinate[0].toFixed(5)+' · proposed study stop';
        row.append(objectiveLabel,dwellLabel,coordinate);
      }
      container.append(row);
    }
  }
  function readInput(){return marswalkInput({name:el('science-name').value,crew:el('science-crew').value,equipment:el('science-kit').value,notes:el('science-notes').value,
    slope:el('science-slope').value,distanceKm:el('science-distance').value,durationHours:el('science-duration').value,speedKmH:el('science-speed').value,returnToStart:el('science-return').checked,modelHour:selectedHour()},selectedTasks());}
  function renderResult(){
    el('marswalk-result').hidden=false;
    text('brief-name',input.name);text('brief-route-summary',input.site_ids.length+' science stop'+(input.site_ids.length===1?'':'s')+' · '+input.crew_count+' crew · '+(input.return_to_start?'Return to staging':'One-way traverse'));
    text('brief-kit','Equipment: '+(input.equipment||'None specified'));text('brief-notes',input.notes||'');el('brief-notes').hidden=!input.notes;
    text('brief-distance',(result.metrics.distance_m/1000).toFixed(2)+' km');text('brief-total',minutes(result.metrics.total_duration_s));text('brief-walking',minutes(result.metrics.walking_duration_s));text('brief-science',minutes(result.metrics.science_duration_s));
    text('brief-time-left',minutes(result.budget.duration_remaining_s)+' remaining');text('brief-distance-left',(result.budget.distance_remaining_m/1000).toFixed(2)+' km remaining');
    text('brief-slope',result.metrics.max_slope_deg.toFixed(1)+'° / '+input.constraints.max_slope_deg+'° limit');
    el('time-budget-meter').value=result.metrics.total_duration_s;el('time-budget-meter').max=input.constraints.max_duration_s;
    el('distance-budget-meter').value=result.metrics.distance_m;el('distance-budget-meter').max=input.constraints.max_distance_m;
    const list=el('science-itinerary');list.replaceChildren();
    for(const segment of result.itinerary){
      const row=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('p');
      title.textContent=segment.to;detail.textContent=`${(segment.distance_m/1000).toFixed(2)} km walking · arrive +${minutes(segment.arrival_elapsed_s)} · science ${minutes(segment.observation_duration_s)}`;
      row.append(title,detail);if(segment.site_id){const goal=document.createElement('small');goal.textContent=result.destinations.find(site=>site.id===segment.site_id).objective;row.append(goal);}list.append(row);
    }
    const listSources=el('brief-source-list');listSources.replaceChildren();
    for(const [label,kind,url]of [
      ['MRO / HiRISE orthophoto','Optical','https://www.uahirise.org/ESP_033014_2260'],
      ['MRO / HiRISE stereo DTM','Topographic','https://www.uahirise.org/dtm/dtm.php?ID=ESP_034082_2260'],
      ['Mars Odyssey / THEMIS','Thermal infrared','https://trek.nasa.gov/mars/']]){
      const item=document.createElement('li'),link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent=kind+' · '+label;item.append(link);listSources.append(item);
    }
    const warnings=el('brief-limitations');warnings.replaceChildren();
    for(const warning of briefingSnapshot(input,result,climate,selectedHour()).limitations){const row=document.createElement('li');row.textContent=warning;warnings.append(row);}
    for(const id of ['marswalk-save','marswalk-map','marswalk-export','marswalk-print'])el(id).disabled=false;
    note('Feasible under the selected terrain, distance and time constraints. Review unresolved hazards before any operational use.');
  }
  function selectedHour(){return Number(el('environment-hour').value);}
  function renderEnvironment(){
    if(!climate)return;
    const hour=selectedHour(),sample=climate.samples.find(s=>s.local_hour===hour)||climate.samples[0];
    text('environment-hour-label',String(sample.local_hour).padStart(2,'0')+':00 local solar time');
    text('environment-air',sample.air_temperature_c.toFixed(1)+' °C');text('environment-surface',sample.surface_temperature_c.toFixed(1)+' °C');
    text('environment-pressure',sample.pressure_pa.toFixed(0)+' Pa');text('environment-wind',sample.wind_speed_m_s.toFixed(1)+' m/s');
    text('environment-dust',sample.dust_optical_depth.toFixed(3));text('environment-sun',sample.surface_solar_flux_w_m2.toFixed(0)+' W/m²');
    text('environment-provenance',climate.season+' · Ls '+climate.solar_longitude_deg+'° · '+climate.altitude_above_surface_m+' m above surface · one model column at the sector center.');
    el('environment-source').href=climate.request_url;
  }
  async function refreshArchive(){
    try{
      const archive=await request('/missions'),list=el('science-archive');list.replaceChildren();
      const current=archive.items.filter(mission=>mission.region_id==='arcadia-planitia-hirise-v1');
      if(!current.length){list.textContent='No science Marswalks saved yet.';return;}
      for(const mission of current){
        const button=document.createElement('button');button.type='button';button.className='science-archive-item';button.textContent=mission.name+' · '+mission.site_ids.length+' stop(s)';
        button.addEventListener('click',async()=>{
          invalidate();el('science-name').value=mission.name;el('science-crew').value=String(mission.crew_count||2);el('science-kit').value=mission.equipment||'';el('science-notes').value=mission.notes||'';
          const c=mission.constraints;el('science-slope').value=String(c.max_slope_deg);el('science-distance').value=String(c.max_distance_m/1000);el('science-duration').value=String(c.max_duration_s/3600);el('science-speed').value=String(c.walking_speed_m_s*3.6);el('science-return').checked=mission.return_to_start;
          el('environment-hour').value=String(mission.model_local_hour??12);renderEnvironment();
          tasks=sites.map(site=>{const task=mission.observation_tasks?.find(item=>item.site_id===site.id);return {...site,selected:mission.site_ids.includes(site.id),minutes:(task?.dwell_time_s??site.dwell_time_s)/60,objective:task?.objective??site.objective};}).sort((a,b)=>{
            const ai=mission.site_ids.indexOf(a.id),bi=mission.site_ids.indexOf(b.id);return (ai<0?99:ai)-(bi<0?99:bi);
          });
          renderTasks();note('Saved inputs restored. Calculate to refresh the briefing.');el('science-name').focus();
        });list.append(button);
      }
    }catch(error){el('science-archive').textContent=error.message;}
  }
  el('science-form').addEventListener('input',invalidate);
  el('science-form').addEventListener('change',invalidate);
  el('science-form').addEventListener('submit',async event=>{
    event.preventDefault();const version=++revision,button=el('calculate-marswalk');button.disabled=true;button.textContent='Calculating measured traverse...';note('Checking science time, walking distance, slopes and return leg...');
    try{
      const candidate=readInput();
      const route=await terrainEngine.call('science-route',candidate);
      if(version!==revision)return;
      input=candidate;result=route;savedId=null;savedRoute=null;renderResult();
    }catch(error){if(version===revision){result=null;el('marswalk-result').hidden=true;note(error.message,true);}}
    finally{button.disabled=false;button.textContent='Calculate science Marswalk';}
  });
  el('marswalk-map').addEventListener('click',()=>{if(result)actions.showRoute(input,result,sites);});
  el('marswalk-save').addEventListener('click',async()=>{
    if(!result)return;const button=el('marswalk-save'),version=revision,snapshot=structuredClone(input);button.disabled=true;
    try{
      let missionId=savedId;
      if(!missionId){const mission=await request('/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});missionId=mission.id;if(version===revision)savedId=missionId;}
      const route=await request('/missions/'+missionId+'/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(version!==revision){await refreshArchive();return;}
      savedId=missionId;savedRoute=route;
      note('Science Marswalk and its route saved to the mission archive.');button.textContent='Saved';await refreshArchive();
    }catch(error){if(version===revision){note('Save failed: '+error.message,true);button.disabled=false;}}
  });
  el('marswalk-export').addEventListener('click',()=>{
    if(!result)return;const snapshot=briefingSnapshot(input,savedRoute||result,climate,selectedHour(),sources);
    const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='arcadia-marswalk-briefing.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  el('marswalk-print').addEventListener('click',()=>{const panels=[...document.querySelectorAll('#view-science details')].map(panel=>[panel,panel.open]);for(const [panel]of panels)panel.open=true;try{window.print();}finally{for(const [panel,wasOpen]of panels)panel.open=wasOpen;}});
  el('environment-hour').addEventListener('input',()=>{renderEnvironment();if(result){input={...input,model_local_hour:selectedHour()};savedId=null;savedRoute=null;el('marswalk-save').disabled=false;el('marswalk-save').textContent='Save Marswalk';note('Archived environment reference updated. Route geometry is unchanged.');}});
  el('refresh-science-archive').addEventListener('click',refreshArchive);
  note('Loading science stops and archived environmental context...');
  const responses=await Promise.allSettled([request('/regions/arcadia-planitia-hirise-v1/sites'),request('/regions/arcadia-planitia-hirise-v1/climate'),request('/datasets?region_id=arcadia-planitia-hirise-v1')]);
  if(responses[0].status==='fulfilled'){sites=responses[0].value.items;tasks=sites.map((site,index)=>({...site,selected:index===0,minutes:site.dwell_time_s/60}));renderTasks();}
  else{note('Science stops could not load: '+responses[0].reason.message,true);el('calculate-marswalk').disabled=true;}
  if(responses[1].status==='fulfilled'){climate=responses[1].value;renderEnvironment();}else text('environment-provenance','Environmental context could not load. No current-conditions claim is made.');
  if(responses[2].status==='fulfilled')sources=responses[2].value.items;
  el('science-slope').value=String(planningSettings.maxSlope);await refreshArchive();
  if(sites.length)note('Select science objectives, order the stops, then calculate your Marswalk.');
  return {refreshArchive};
}
