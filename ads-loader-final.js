(function(){
'use strict';
var NATIVE_SRC='https://closurenosy.com/0327a0284d2be31da068607e5bceb134/invoke.js';
var CONTAINER_ID='container-0327a0284d2be31da068607e5bceb134';
function native(slot){
  if(!slot || slot.getAttribute('data-native-loaded')==='1') return;
  slot.setAttribute('data-native-loaded','1');
  slot.innerHTML='';
  var canvas=document.createElement('div');
  canvas.className='native-ad-canvas';
  var box=document.createElement('div');
  box.className='native-ad-design';
  box.style.width='1200px'; box.style.minHeight='250px'; box.style.position='relative';
  var script=document.createElement('script');
  script.async=true; script.setAttribute('data-cfasync','false'); script.src=NATIVE_SRC;
  box.appendChild(script);
  var holder=document.createElement('div'); holder.id=CONTAINER_ID; box.appendChild(holder);
  canvas.appendChild(box); slot.appendChild(canvas);
  function scale(){
    var w=slot.clientWidth||document.documentElement.clientWidth||360;
    var s=Math.min(1,w/1200);
    box.style.transform='scale('+s+')'; box.style.transformOrigin='top left';
    canvas.style.height=Math.ceil(250*s)+'px'; canvas.style.width='100%';
  }
  scale();
  if(window.ResizeObserver){new ResizeObserver(scale).observe(slot);} else window.addEventListener('resize',scale);
}
function init(){
  var slots=document.querySelectorAll('.sheet-ad-slot[data-native-ad], .native-sheet-ad-slot');
  if(!slots.length){
    var top=document.querySelector('.ad-slot.top');
    if(top){top.classList.add('native-sheet-ad-slot'); slots=[top];}
  }
  for(var i=0;i<slots.length;i++) native(slots[i]);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();