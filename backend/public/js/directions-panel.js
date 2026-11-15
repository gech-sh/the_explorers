import { REGIONS, PERSEVERANCE_WAYPOINTS } from './config.js';
import {parseMarsCoordinates,searchPlaces,resolveEndpoint} from './directions-model.js';
const el=id=>document.getElementById(id);
export function createDirectionsPanel(actions){
  const input={A:el('from-input'),B:el('destination-input')},lists={A:el('from-suggestions'),B:el('destination-suggestions')};
  const selected={},active={A:-1,B:-1},suggestions={A:[],B:[]};
  let dirty=false,fingerprint='',currentRoute;
  function places(){
    const state=actions.getState(),region=REGIONS[state.regionId],all=[];
    const add=(point,group)=>{if(point?.name&&Array.isArray(point.coords))all.push({...point,group});};
    add(region.pointA,'Staging origin');add(region.pointB,'Study destination');
    for(const scenario of region.scenarios||[]){add(scenario.a,'Study place');add(scenario.b,scenario.key.startsWith('ar-')?'AR source location':'Measured study site');}
    if(state.regionId==='arcadia')for(const site of region.unified?.sites||[])add({name:site.name||site.id,coords:[...site.coordinate].reverse()},site.source_group==='ar'?'AR source location':'Measured study site');
    if(state.regionId==='jezero')for(const point of PERSEVERANCE_WAYPOINTS)add(point,'Jezero reference place');
    const seen=new Set();return all.filter(place=>{const key=place.name.toLowerCase()+'|'+place.coords.join(',');if(seen.has(key))return false;seen.add(key);return true;});
  }
  function close(target){lists[target].hidden=true;input[target].setAttribute('aria-expanded','false');input[target].removeAttribute('aria-activedescendant');active[target]=-1;}
  function clearError(){el('directions-error').textContent='';for(const field of Object.values(input))field.removeAttribute('aria-invalid');}
  function draft(){dirty=true;clearError();el('directions-summary').hidden=true;el('directions-steps').hidden=true;el('directions-hint').textContent='Ready when you are. Choose both places, then get directions.';actions.onDraft?.();}
  function choose(target,place){input[target].value=place.name;selected[target]=place;draft();input[target].focus();close(target);}
  function renderSuggestions(target){
    const field=input[target],list=lists[target],coords=parseMarsCoordinates(field.value);
    suggestions[target]=coords?[{name:field.value.trim(),coords,group:'Mars coordinates'}]:searchPlaces(places(),field.value);
    list.replaceChildren();active[target]=-1;
    for(const [index,place]of suggestions[target].entries()){
      const option=document.createElement('div');option.id=target+'-place-'+index;option.className='place-option';option.setAttribute('role','option');option.setAttribute('aria-selected','false');
      const icon=document.createElement('i');icon.className='fa-solid fa-location-dot';icon.setAttribute('aria-hidden','true');
      const copy=document.createElement('div'),title=document.createElement('strong'),subtitle=document.createElement('small');
      title.textContent=place.name;subtitle.textContent=`${place.group} · ${place.coords[0].toFixed(4)}, ${place.coords[1].toFixed(4)}`;copy.append(title,subtitle);option.append(icon,copy);
      option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(target,place));list.append(option);
    }
    list.hidden=!suggestions[target].length;field.setAttribute('aria-expanded',String(!list.hidden));
  }
  for(const target of ['A','B']){
    input[target].addEventListener('input',()=>{selected[target]=null;draft();renderSuggestions(target);});
    input[target].addEventListener('focus',()=>renderSuggestions(target));
    input[target].addEventListener('blur',()=>close(target));
    input[target].addEventListener('keydown',event=>{
      if(event.key==='Escape'){close(target);return;}
      if(['ArrowDown','ArrowUp'].includes(event.key)){
        event.preventDefault();if(lists[target].hidden)renderSuggestions(target);
        const count=suggestions[target].length;if(!count)return;
        active[target]=(active[target]+(event.key==='ArrowDown'?1:-1)+count)%count;
        for(const [index,option]of [...lists[target].children].entries())option.setAttribute('aria-selected',String(index===active[target]));
        input[target].setAttribute('aria-activedescendant',target+'-place-'+active[target]);lists[target].children[active[target]]?.scrollIntoView({block:'nearest'});
      }
      if(event.key==='Enter'&&!lists[target].hidden&&active[target]>=0){event.preventDefault();choose(target,suggestions[target][active[target]]);}
    });
  }
  function submit(calculate=true){
    clearError();const resolved={};
    for(const target of ['A','B']){
      try{resolved[target]=resolveEndpoint(input[target].value,places(),selected[target]);}
      catch(error){input[target].setAttribute('aria-invalid','true');el('directions-error').textContent=(target==='A'?'From: ':'Destination: ')+error.message;input[target].focus();return;}
    }
    close('A');close('B');dirty=false;actions.onSubmit(resolved.A,resolved.B,calculate);
  }
  el('directions-form').addEventListener('submit',event=>{event.preventDefault();submit();});
  el('use-measured-route').addEventListener('click',()=>{const region=REGIONS[actions.getState().regionId];choose('A',region.pointA);choose('B',region.pointB);submit(false);actions.onFit();});
  el('directions-fit').addEventListener('click',()=>actions.onFit());
  function sync(state){
    const key=JSON.stringify([state.regionId,state.pointA,state.pointB]);if(key===fingerprint)return;
    fingerprint=key;dirty=false;clearError();
    for(const [target,point]of [['A',state.pointA],['B',state.pointB]]){input[target].value=point.name;selected[target]={...point};close(target);}
    el('directions-hint').textContent='Search study places, enter coordinates, or choose points on the map.';
  }
  function setBusy(busy){
    const button=el('get-directions');button.disabled=busy;button.setAttribute('aria-busy',String(busy));el('get-directions-label').textContent=busy?'Finding your route...':'Get directions';
  }
  function setRoute(route){
    setBusy(false);if(dirty)return;currentRoute=route;
    for(const button of el('route-comparison').querySelectorAll('.route-choice'))button.setAttribute('aria-pressed',String(button.dataset.objective===route.raw?.objective));
    el('directions-summary').hidden=!route.available;el('directions-steps').hidden=!route.available;
    if(!route.available){el('directions-hint').textContent=route.message||'No measured route is available for these locations.';return;}
    const meters=route.totalTraverseKm*1000;
    el('directions-distance').textContent=meters<1000?Math.round(meters)+' m':route.totalTraverseKm.toFixed(2)+' km';
    el('directions-duration').textContent=route.timeString;
    el('directions-source').textContent=(route.kind==='science_marswalk'?'Science Marswalk':route.kind==='detailed_traverse'?'HiRISE detail':'Regional concept')+' · '+route.resolution_m+' m grid';
    el('directions-hint').textContent='Your route is ready. After moving a pin, click Get directions again.';
    const steps=route.raw?.steps||[],list=el('turn-list');list.replaceChildren();
    for(const step of steps.slice(0,24))appendStep(step);
    el('directions-step-count').textContent=steps.length+' direction segments';
    if(steps.length>24){const more=document.createElement('button');more.type='button';more.className='route-more';more.textContent='Show '+(steps.length-24)+' more segments';more.addEventListener('click',()=>{more.remove();for(const step of steps.slice(24))appendStep(step);});list.after(more);el('directions-steps').querySelectorAll('.route-more').forEach(button=>{if(button!==more)button.remove();});}
    else el('directions-steps').querySelectorAll('.route-more').forEach(button=>button.remove());
    function appendStep(step){const item=document.createElement('li'),label=document.createElement('span'),distance=document.createElement('small');label.textContent=step.instruction;distance.textContent=step.distance_m<1000?step.distance_m+' m':(step.distance_m/1000).toFixed(2)+' km';item.append(label,distance);list.append(item);}
  }
  function resetRoute(){setBusy(false);el('route-comparison').hidden=true;el('directions-summary').hidden=true;el('directions-steps').hidden=true;el('directions-hint').textContent='Click Get directions to show both path options.';}
  function setAlternatives(routes){
    const wrapper=el('route-comparison');wrapper.replaceChildren();wrapper.hidden=!routes.length;
    for(const route of routes){
      const safe=route.raw.objective==='gentlest',button=document.createElement('button');button.type='button';button.className='route-choice';button.dataset.objective=route.raw.objective;button.setAttribute('aria-pressed','false');
      const title=document.createElement('strong'),detail=document.createElement('small');title.textContent=safe?'Safest by slope':'Best path - shortest';detail.textContent=`${route.totalTraverseKm.toFixed(2)} km | ${route.timeString} | peak ${route.raw.metrics.max_slope_deg.toFixed(1)} deg`;
      button.append(title,detail);button.addEventListener('click',()=>actions.onSelectRoute?.(route));wrapper.append(button);
    }
    const note=document.createElement('p');note.className='route-comparison-note';note.textContent=routes.length===2&&JSON.stringify(routes[0].routePoints)===JSON.stringify(routes[1].routePoints)?'Both criteria select the same path. Safety beyond measured slope is unverified.':'Blue: shortest feasible path. Green: lowest possible peak measured slope. Other hazards remain unverified.';wrapper.append(note);
  }
  return {sync,setBusy,setRoute,resetRoute,setAlternatives,isDirty:()=>dirty,
    knownPoints(){const points={};for(const key of ['A','B']){try{points[key]=resolveEndpoint(input[key].value,places(),selected[key]);}catch{}}return points;},
    setActiveTarget(target){for(const key of ['A','B'])el(key==='A'?'from-row':'destination-row').dataset.active=String(key===target);el('directions-hint').textContent='Click the map to choose your '+(target==='A'?'starting point.':'destination.');},
    swap(){const value=input.A.value;input.A.value=input.B.value;input.B.value=value;const place=selected.A;selected.A=selected.B;selected.B=place;draft();submit(false);}
  };
}
