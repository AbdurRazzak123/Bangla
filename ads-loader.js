/* বাংলা সংবাদ — Google Sheet controlled Ads
   Ads tab columns:
   A Position | B Active | C Image URL | D Click URL | E Title | F Ad Code

   This version keeps the whole website responsive. ONLY the ad creative is
   placed on a fixed 1200px desktop canvas and scaled down on small screens.
*/
(function(){
'use strict';
const SHEET_ID='1gX73WskIs3D-8IcyPJ24NT0xn1KIEJSjMXOF9nCQqTg';
const SHEET_URL='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:json&sheet=Ads';
const DESIGN_WIDTH=1200;
const NATIVE_HOST='closurenosy.com';

const val=(r,i)=>r&&r.c&&r.c[i]&&r.c[i].v!=null?String(r.c[i].v).trim():'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function parse(raw){
  const a=raw.indexOf('{'), b=raw.lastIndexOf('}')+1;
  if(a<0||b<=a) throw new Error('Invalid Google Sheet response');
  const d=JSON.parse(raw.slice(a,b));
  return d.table&&Array.isArray(d.table.rows)?d.table.rows:[];
}
function isActive(v){
  v=String(v||'').toLowerCase().trim();
  return !v||['yes','true','1','active','on','হ্যাঁ','চালু'].includes(v);
}
function normalizePosition(v){
  const p=String(v||'').toUpperCase().trim().replace(/[-_]+/g,' ').replace(/\s+/g,' ');
  if(p==='TOP') return 'TOP';
  if(p==='BOTTOM'||p==='FOOTER') return 'BOTTOM';
  if(p==='MIDDLE TOP'||p==='MIDDLETOP') return 'MIDDLE_TOP';
  if(p==='MIDDLE BOTTOM'||p==='MIDDLEBOTTOM') return 'MIDDLE_BOTTOM';
  if(p==='MIDDLE') return 'MIDDLE';
  if(p==='ALL'||p==='EVERYWHERE'||p==='ALL POSITIONS') return 'ALL';
  return '';
}
function safeUrl(s){
  const u=String(s||'').trim();
  return /^(https?:|mailto:|tel:)/i.test(u)?u:'';
}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function installAdStyles(){
  if(document.getElementById('sheet-native-ad-styles')) return;
  const style=document.createElement('style');
  style.id='sheet-native-ad-styles';
  style.textContent=`
.sheet-ad-slot[data-sheet-native="yes"]{
  width:100%!important;max-width:1200px!important;min-width:0!important;
  margin:18px auto!important;padding:0!important;border:0!important;
  overflow:hidden!important;display:block!important;box-sizing:border-box!important;
  min-height:0!important;height:auto!important;background:transparent!important;
}
.sheet-ad-slot[data-sheet-native="yes"] .sheet-native-viewport{
  width:100%!important;max-width:1200px!important;min-width:0!important;
  margin:0 auto!important;padding:0!important;overflow:hidden!important;
  display:block!important;box-sizing:border-box!important;line-height:0!important;
}
.sheet-ad-slot[data-sheet-native="yes"] .sheet-native-canvas{
  width:1200px!important;min-width:1200px!important;max-width:none!important;
  margin:0!important;padding:0!important;display:block!important;
  transform-origin:top left!important;position:relative!important;
  box-sizing:border-box!important;line-height:normal!important;
}
.sheet-native-canvas [id^="container-"]{max-width:none!important;}
`;
  document.head.appendChild(style);
}

function getSlots(){
  const all=Array.from(document.querySelectorAll('.ad-slot[data-ad-slot],.ad-slot[data-ad-position],.sheet-ad-slot[data-ad-slot],.sheet-ad-slot[data-ad-position]'));
  const seen=new Set();
  return all.filter(s=>{if(seen.has(s))return false;seen.add(s);return true;});
}
function canonicalSlotPosition(slot){
  return normalizePosition(slot.getAttribute('data-ad-position')||slot.getAttribute('data-ad-slot')||'');
}
function mapSlots(slots){
  const explicit=slots.map(canonicalSlotPosition);
  if(explicit.every(Boolean)) return explicit;
  if(slots.length===2) return ['TOP','BOTTOM'];
  if(slots.length===3) return ['TOP','MIDDLE','BOTTOM'];
  if(slots.length===4) return ['TOP','MIDDLE_TOP','MIDDLE_BOTTOM','BOTTOM'];
  return [];
}
function pick(sets,pos,used){
  let list=sets[pos]||[];
  if(list.length){const i=used[pos]||0;used[pos]=i+1;return list[i%list.length];}
  if((sets.ALL||[]).length) return sets.ALL[0];
  if(pos==='MIDDLE' && (sets.MIDDLE||[]).length) return sets.MIDDLE[0];
  if((pos==='MIDDLE_TOP'||pos==='MIDDLE_BOTTOM') && (sets.MIDDLE||[]).length){
    const i=used.MIDDLE||0;used.MIDDLE=i+1;return sets.MIDDLE[i%(sets.MIDDLE.length)];
  }
  return null;
}

function appendCreativeCode(canvas,code,title){
  const template=document.createElement('template');
  template.innerHTML=String(code||'').trim();
  const scripts=[];
  const nodes=Array.from(template.content.childNodes);

  // Put normal nodes in first so a dynamically loaded ad script can always
  // find its target container, even though the provider's supplied snippet
  // places the async script before the container.
  nodes.forEach(node=>{
    if(node.nodeType===1 && node.tagName.toLowerCase()==='script') scripts.push(node);
    else canvas.appendChild(node.cloneNode(true));
  });

  scripts.forEach(old=>{
    const s=document.createElement('script');
    for(const attr of Array.from(old.attributes)) s.setAttribute(attr.name,attr.value);
    if(old.src || old.getAttribute('src')){
      s.async = old.async || old.getAttribute('async')!==null;
      s.src = old.src || old.getAttribute('src');
    }else{
      s.text = old.text || old.textContent || '';
    }
    canvas.appendChild(s);
  });
  return true;
}

function renderNative(slot,ad){
  if(!ad||!ad.code) return false;
  if(!/closurenosy\.com/i.test(ad.code)) return false;

  slot.classList.add('sheet-ad-slot');
  slot.setAttribute('data-sheet-native','yes');
  slot.setAttribute('data-ad-loaded','yes');
  slot.innerHTML='';

  const viewport=document.createElement('div');
  viewport.className='sheet-native-viewport';
  const canvas=document.createElement('div');
  canvas.className='sheet-native-canvas';
  canvas.setAttribute('data-ad-title',ad.title||'Advertisement');
  viewport.appendChild(canvas);
  slot.appendChild(viewport);

  const fit=()=>{
    const w=Math.max(1,viewport.clientWidth||slot.clientWidth||DESIGN_WIDTH);
    const scale=Math.min(1,w/DESIGN_WIDTH);
    canvas.style.transform='scale('+scale+')';
    // Estimate the visible creative height without changing the page layout.
    let h=250;
    const children=Array.from(canvas.children);
    children.forEach(el=>{
      try{
        const r=el.getBoundingClientRect();
        if(r.height) h=Math.max(h,r.height/scale);
      }catch(e){}
    });
    h=Math.min(900,Math.max(90,h));
    viewport.style.height=Math.ceil(h*scale)+'px';
  };
  if(window.ResizeObserver){
    const ro=new ResizeObserver(fit); ro.observe(viewport);
  }else window.addEventListener('resize',fit,{passive:true});
  appendCreativeCode(canvas,ad.code,ad.title);
  fit();
  [100,400,1000,2000,4000,7000].forEach(ms=>setTimeout(fit,ms));
  return true;
}

function renderImage(slot,ad){
  const src=safeUrl(ad&&ad.image), href=safeUrl(ad&&ad.click);
  if(!src) return false;
  slot.classList.add('sheet-ad-slot');
  slot.setAttribute('data-sheet-native','yes');
  slot.setAttribute('data-ad-loaded','yes');
  slot.innerHTML='';
  const viewport=document.createElement('div'); viewport.className='sheet-native-viewport';
  const img=document.createElement('img');
  img.src=src; img.alt=ad.title||'Advertisement'; img.loading='lazy';
  img.style.cssText='display:block;width:100%;height:auto;max-width:1200px;margin:0 auto;border:0;';
  if(href){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.style.display='block';a.appendChild(img);viewport.appendChild(a);}else viewport.appendChild(img);
  slot.appendChild(viewport); return true;
}

async function fetchRows(){
  let last;
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(SHEET_URL+'&_='+Date.now()+'-'+i,{cache:'no-store',credentials:'omit'});
      if(!r.ok) throw new Error('Google Sheet HTTP '+r.status);
      return parse(await r.text());
    }catch(e){last=e;if(i<2)await sleep(700*(i+1));}
  }
  throw last||new Error('Google Sheet unavailable');
}

async function load(){
  installAdStyles();
  const slots=getSlots();
  if(!slots.length) return;
  const positions=mapSlots(slots);
  if(positions.length!==slots.length){console.warn('Ads: unsupported slot layout');return;}
  try{
    const rows=await fetchRows();
    const sets={TOP:[],MIDDLE:[],MIDDLE_TOP:[],MIDDLE_BOTTOM:[],BOTTOM:[],ALL:[]};
    rows.forEach(r=>{
      const pos=normalizePosition(val(r,0));
      if(!pos||!Object.prototype.hasOwnProperty.call(sets,pos)||!isActive(val(r,1))) return;
      const ad={image:val(r,2),click:val(r,3),title:val(r,4),code:val(r,5)};
      if(ad.code||ad.image) sets[pos].push(ad);
    });

    const used={TOP:0,MIDDLE:0,MIDDLE_TOP:0,MIDDLE_BOTTOM:0,BOTTOM:0,ALL:0};
    const usedCode=new Set();
    slots.forEach((slot,i)=>{
      let pos=positions[i];
      if(pos==='MIDDLE' && slots.length===4){
        const n=positions.slice(0,i+1).filter(x=>x==='MIDDLE').length;
        pos=n===1?'MIDDLE_TOP':'MIDDLE_BOTTOM';
      }
      slot.setAttribute('data-ad-position',pos.toLowerCase().replace(/_/g,'-'));
      slot.setAttribute('data-ad-slot',pos.toLowerCase().replace(/_/g,'-'));
      const ad=pick(sets,pos,used);
      if(!ad){slot.setAttribute('data-ad-loaded','no-ad');return;}

      // The supplied Native Banner uses one fixed container ID. The same
      // snippet cannot safely exist more than once in one HTML document.
      // If the Sheet repeats that exact code in multiple rows, render the
      // first occurrence only; different ad codes may still render separately.
      if(ad.code && /container-0327a0284d2be31da068607e5bceb134/i.test(ad.code)){
        const key=ad.code.replace(/\s+/g,' ').trim();
        if(usedCode.has(key)){
          slot.innerHTML='';
          slot.setAttribute('data-ad-loaded','duplicate-native-code');
          return;
        }
        usedCode.add(key);
      }
      if(ad.code && renderNative(slot,ad)) return;
      if(renderImage(slot,ad)) return;
      slot.setAttribute('data-ad-loaded','no-render');
    });
  }catch(e){
    console.warn('Google Sheet Ads load failed:',e);
    slots.forEach(s=>s.setAttribute('data-ad-loaded','sheet-error'));
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
else load();
})();
