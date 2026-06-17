import { QuartzComponent, QuartzComponentConstructor } from "./types"

const BestiarioScript: QuartzComponent = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){

// ── Tag filter ──────────────────────────────────────────────────
function initTagFilter(){
  var filterEl = document.getElementById('bestiario-tag-filter');
  if(!filterEl) return;
  var buttons = filterEl.querySelectorAll('.tag-btn[data-filter]');
  var entries = document.querySelectorAll('.entry-item[data-tags]');
  var allBtn  = filterEl.querySelector('.tag-btn[data-filter="all"]');

  function applyFilter(){
    var active = Array.from(filterEl.querySelectorAll('.tag-btn.active:not([data-filter="all"])'))
                      .map(function(b){ return b.dataset.filter; });
    entries.forEach(function(e){
      if(!active.length){ e.style.display=''; return; }
      var tags = (e.dataset.tags||'').split(',').map(function(t){ return t.trim(); });
      e.style.display = active.some(function(f){ return tags.indexOf(f)!==-1; }) ? '' : 'none';
    });
    document.querySelectorAll('.entry-grid').forEach(function(grid){
      var visible = Array.from(grid.querySelectorAll('.entry-item')).some(function(e){ return e.style.display!=='none'; });
      grid.style.display = visible ? '' : 'none';
      var stamp = grid.previousElementSibling;
      if(stamp && stamp.classList.contains('archive-stamp')) stamp.style.display = visible ? '' : 'none';
    });
  }

  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.dataset.filter==='all'){
        buttons.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        entries.forEach(function(e){ e.style.display=''; });
        document.querySelectorAll('.entry-grid, .archive-stamp').forEach(function(el){ el.style.display=''; });
        return;
      }
      if(allBtn) allBtn.classList.remove('active');
      btn.classList.toggle('active');
      var anyActive = Array.from(filterEl.querySelectorAll('.tag-btn.active:not([data-filter="all"])')).length > 0;
      if(!anyActive && allBtn) allBtn.classList.add('active');
      applyFilter();
    });
  });
}

// ── Threat overlay ──────────────────────────────────────────────
function initThreatOverlay(){
  var threat = document.body.dataset.threat;
  if(!threat || (threat!=='III' && threat!=='IV')) return;
  var key = 'sm-threat-' + window.location.pathname;
  try{ if(sessionStorage.getItem(key)) return; } catch(e){}
  var msgs = {
    'III': {
      badge: 'Amenaza III — Prioridad crítica',
      title: 'Acceso restringido — Documentación clasificada',
      body:  'Esta entrada contiene datos operativos de una especie con capacidad letal confirmada. La lectura de este archivo implica comprensión del protocolo de seguridad establecido para Amenaza III.',
      btn:   'Confirmar acceso — Acepto protocolo operativo'
    },
    'IV': {
      badge: 'Amenaza IV — Clase Extinción',
      title: 'Advertencia de clasificación máxima',
      body:  'Esta entrada contiene información sobre una entidad de Clase Extinción. Los datos disponibles son incompletos. No hay registro de supervivencia documentada de encuentro cercano.',
      btn:   'Confirmar acceso — Autorización Nivel ██ aceptada'
    }
  };
  var m = msgs[threat];
  var overlay = document.createElement('div');
  overlay.className = 'threat-overlay';
  overlay.innerHTML =
    '<div class="threat-overlay-inner">' +
      '<div class="threat-level-badge">'+m.badge+'</div>' +
      '<h2>'+m.title+'</h2>' +
      '<p>'+m.body+'</p>' +
      '<button class="threat-access-btn">'+m.btn+'</button>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.threat-access-btn').addEventListener('click', function(){
    overlay.remove();
    try{ sessionStorage.setItem(key,'1'); } catch(e){}
  });
}

// ── Custom audio player ─────────────────────────────────────────
function initAudioPlayers(){
  function fmt(s){
    if(!isFinite(s)||isNaN(s)) return '--:--';
    var m=Math.floor(s/60), sec=Math.floor(s%60);
    return m+':'+(sec<10?'0':'')+sec;
  }
  document.querySelectorAll('audio').forEach(function(audio){
    if(audio.closest('.sm-player')) return;
    var wrapper = document.createElement('div');
    wrapper.className='sm-player'; wrapper.dataset.state='paused';
    var playBtn=document.createElement('button');
    playBtn.className='sm-play-btn'; playBtn.setAttribute('aria-label','Play / Pause'); playBtn.textContent='▶';
    var track=document.createElement('div'); track.className='sm-track';
    var bar=document.createElement('div'); bar.className='sm-bar';
    var barFill=document.createElement('div'); barFill.className='sm-bar-fill';
    var barCur=document.createElement('div'); barCur.className='sm-bar-cursor';
    bar.appendChild(barFill); bar.appendChild(barCur);
    var timeRow=document.createElement('div'); timeRow.className='sm-time';
    var timeCur=document.createElement('span'); timeCur.className='sm-time-cur'; timeCur.textContent='0:00';
    var timeSep=document.createElement('span'); timeSep.className='sm-time-sep'; timeSep.textContent='/';
    var timeDur=document.createElement('span'); timeDur.className='sm-time-dur'; timeDur.textContent='--:--';
    timeRow.appendChild(timeCur); timeRow.appendChild(timeSep); timeRow.appendChild(timeDur);
    track.appendChild(bar); track.appendChild(timeRow);
    var signal=document.createElement('div'); signal.className='sm-signal';
    for(var i=0;i<5;i++) signal.appendChild(document.createElement('span'));
    wrapper.appendChild(playBtn); wrapper.appendChild(track); wrapper.appendChild(signal);
    audio.parentNode.insertBefore(wrapper, audio);
    wrapper.appendChild(audio);
    audio.addEventListener('loadedmetadata',function(){ timeDur.textContent=fmt(audio.duration); });
    audio.addEventListener('timeupdate',function(){
      var pct=audio.duration?(audio.currentTime/audio.duration)*100:0;
      barFill.style.width=pct+'%'; barCur.style.left=pct+'%'; timeCur.textContent=fmt(audio.currentTime);
    });
    audio.addEventListener('ended',function(){ wrapper.dataset.state='paused'; playBtn.textContent='▶'; });
    playBtn.addEventListener('click',function(){
      if(audio.paused){
        document.querySelectorAll('.sm-player').forEach(function(p){
          var a=p.querySelector('audio');
          if(a&&a!==audio){ a.pause(); p.dataset.state='paused'; p.querySelector('.sm-play-btn').textContent='▶'; }
        });
        audio.play(); wrapper.dataset.state='playing'; playBtn.textContent='▌▌';
      } else { audio.pause(); wrapper.dataset.state='paused'; playBtn.textContent='▶'; }
    });
    bar.addEventListener('click',function(e){
      if(!audio.duration) return;
      var rect=bar.getBoundingClientRect();
      audio.currentTime=((e.clientX-rect.left)/rect.width)*audio.duration;
    });
  });
}

// ── Institutional footer ────────────────────────────────────────
function buildInstitutionalFooter(){
  var footer = document.querySelector('.page-footer');
  if(!footer) return;
  if(footer.nextElementSibling && footer.nextElementSibling.classList.contains('institutional-footer')) return;
  var inst=document.createElement('div');
  inst.className='institutional-footer';
  inst.innerHTML=
    '<strong>APE — Señal Muerta</strong> / Archivo de Recuperación Post-Emergencia<br>'+
    'Clasificación: Clase C — Testimonial &nbsp;·&nbsp; No distribuir fuera de perímetro autorizado<br>'+
    'Los documentos contenidos en este archivo son testimonios recuperados. La veracidad de su contenido no ha sido verificada de forma independiente.<br>'+
    'Protocolo <span class="redacted" style="font-size:10px">███</span>-C activo — Comité de Preservación <span class="redacted" style="font-size:10px">████████</span>';
  footer.parentNode.insertBefore(inst, footer.nextSibling);
}

// ── Init on load and SPA navigation ────────────────────────────
function init(){
  initTagFilter();
  initThreatOverlay();
  initAudioPlayers();
  buildInstitutionalFooter();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
document.addEventListener('nav', init);

})();
`,
      }}
    />
  )
}

BestiarioScript.displayName = "BestiarioScript"
export default (() => BestiarioScript) satisfies QuartzComponentConstructor
