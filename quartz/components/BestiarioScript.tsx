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

// ── Seismic Panel ───────────────────────────────────────────────
function initSeismicPanel(){
  var panel = document.getElementById('seismic-panel');
  if(!panel) return;

  // Data generated by Python (Ricker wavelet model, fs=100Hz, downsampled 5x)
  // 4 channels: Norte, Sur, Este, Oeste — 600 samples each (30s @ 20Hz effective)
  // Ricker: A*(1−2π²f₀²τ²)*exp(−π²f₀²τ²), f₀≈3.9Hz; Gaussian noise + traffic (9.3,12.1,15.4Hz)
  var CH=[[0.0751,-0.0855,0.0205,-0.0274,0.0261,0.0232,0.0069,0.0412,0.0008,-0.0593,-0.0012,0.0019,-0.0589,0.0849,-0.0692,0.0389,-0.0946,-0.0014,-0.0085,-0.0001,-0.0008,0.0086,-0.015,0.0564,-0.0515,-0.0134,0.0291,-0.0259,0.0506,-0.0336,0.0094,-0.006,0.035,-0.0101,-0.0068,-0.007,0.011,-0.0228,-0.0094,-0.015,0.009,0.031,-0.0785,-0.0346,0.0069,0.0304,-0.0343,-0.0537,0.0527,0.0258,0.0243,-0.027,-0.0147,-0.0191,0.0345,-0.0529,-0.0052,-0.0571,0.0776,-0.0221,-0.0118,-0.0115,0.0533,-0.0091,-0.0117,0.0465,0.0108,0.0266,0.0048,-0.018,0.0044,0.0365,0.0346,-0.008,0.0055,0.0688,-0.0181,-0.0079,-0.0298,0.0063,-0.0239,-0.0181,-0.0249,-0.0242,0.0178,-0.0208,0.0081,-0.0184,0.0279,-0.0366,-0.0103,0.0304,0.0284,-0.0269,-0.1853,-0.3736,0.1286,0.9324,0.1787,-0.3226,-0.2329,-0.0015,-0.0079,0.0276,-0.034,0.025,0.0184,-0.0378,-0.0142,0.0296,0.0416,0.0005,0.0284,-0.0402,0.0507,-0.0798,0.0053,0.0217,0.0202,-0.0183,-0.0048,-0.0873,0.0171,-0.0272,-0.0783,-0.0482,0.0481,-0.0084,0.038,-0.0169,-0.0428,0.0386,0.0165,0.0064,-0.0233,-0.0405,0.0431,-0.0475,-0.0124,0.0446,0.0723,0.0176,-0.0173,-0.0525,0.0474,0.0161,0.0134,-0.0188,-0.014,-0.004,0.0365,-0.0506,0.053,0.0533,-0.0113,-0.0129,-0.0642,0.034,0.0168,0.0262,-0.0135,-0.0237,0.0241,-0.0093,-0.0147,-0.0062,-0.0002,0.0447,-0.0006,-0.0215,-0.003,-0.0336,0.0564,-0.0574,-0.0093,-0.0233,-0.0107,-0.0271,0.0044,0.012,-0.0094,0.0279,-0.0431,-0.0306,0.041,0.0245,-0.0613,0.052,-0.0544,0.0487,-0.0083,-0.0404,-0.0168,-0.0106,-0.0119,-0.0179,0.0632,0.0523,0.0903,-0.1211,-0.006,0.0232,0.0456,-0.001,0.0233,0.1017,0.0136,0.0107,-0.0291,0.0158,-0.0112,-0.0135,-0.1305,0.0374,-0.0643,-0.0161,-0.1043,-0.0074,0.0449,-0.0222,0.0184,-0.0599,0.069,-0.0389,0.0071,-0.0564,0.0064,0.0361,-0.0108,-0.047,0.0199,-0.0126,-0.0077,-0.0115,-0.0307,0.0116,0.0042,-0.0611,0.0077,0.0351,-0.007,-0.0126,-0.0077,-0.0175,-0.0732,0.0083,0.0425,-0.0276,-0.0515,0.0126,-0.0187,-0.0058,-0.0333,-0.0341,0.0545,-0.0256,-0.0141,-0.0001,0.0427,-0.0422,0.0493,0.0142,-0.0294,-0.148,-0.1298,0.1096,0.529,0.1222,-0.205,-0.141,-0.111,0.0939,0.0202,0.0039,-0.0471,-0.0216,0.0033,-0.0283,-0.0055,0.027,-0.0104,0.0017,-0.0057,-0.0392,0.0857,-0.0669,-0.0279,-0.0146,-0.005,0.0013,-0.0213,0.0252,0.018,-0.0111,-0.0061,0.0502,-0.003,0.0158,-0.0391,-0.0804,-0.0371,-0.0157,-0.0087,-0.0106,-0.0312,-0.0159,-0.0036,0.0207,-0.0186,0.0187,0.052,-0.0235,0.0366,0.0128,0.0498,-0.0299,0.0286,0.019,-0.0175,0.058,-0.0186,0.0248,-0.046,-0.0272,-0.0006,-0.0222,-0.0066,0.0804,-0.0243,0.0522,-0.0024,0.0331,-0.0578,0.0225,0.0113,0.0476,-0.0229,0.0061,-0.0351,0.0212,0.0685,0.0043,0.0522,0.0229,-0.0259,0.0194,0.0523,-0.0307,-0.0101,0.0106,0.0135,0.0169,-0.005,-0.0238,-0.0045,0.0216,-0.0441,0.0364,0.0099,0.0423,-0.0052,-0.0089,0.0393,0.0008,0.0064,0.0526,0.0166,-0.0185,-0.0315,-0.0542,0.057,0.004,0.0658,0.0183,-0.0275,0.0338,0.0058,-0.006,-0.0227,0.0057,0.0842,-0.0444,0.0079,-0.0269,-0.0358,0.0125,-0.0178,-0.0101,0.003,-0.011,-0.0344,-0.0442,0.0217,0.0442,0.0107,0.0346,-0.0026,-0.0739,0.0097,-0.0473,-0.0487,-0.1001,0.0661,-0.0351,0.0345,-0.0407,-0.0083,-0.0,0.0505,-0.0392,0.0696,0.0706,-0.0309,0.0263,-0.0534,0.0124,-0.0482,0.0106,0.0056,0.0464,-0.0373,-0.0188,-0.023,0.0194,-0.0045,0.0247,0.0804,-0.0419,-0.0113,-0.0322,-0.0008,-0.0813,-0.0299,-0.0098,-0.0313,0.0604,0.0002,-0.0435,0.0091,0.0499,-0.205,-0.4073,0.0576,1.0,0.1179,-0.3934,-0.1141,-0.0153,-0.0373,-0.006,0.0587,-0.0384,-0.0028,-0.0303,0.0425,-0.0066,-0.0081,-0.042,0.0015,-0.0529,0.0211,0.032,0.0137,0.0317,-0.0284,0.0496,0.0747,-0.039,0.0045,0.0404,0.056,0.0509,-0.1092,-0.0735,0.0402,0.0113,-0.0071,0.0486,0.0621,-0.0032,0.032,0.0417,-0.0566,-0.0245,0.0185,-0.0214,0.0429,-0.0421,-0.0178,-0.0082,-0.0262,0.0102,0.0539,0.0191,-0.033,0.0405,0.0253,0.022,-0.0195,-0.0033,-0.0858,-0.0435,0.0203,-0.0205,-0.0338,-0.0063,0.0948,0.0525,-0.0074,0.0161,-0.0263,-0.0169,0.0478,-0.0232,0.0963,-0.0225,-0.0331,-0.0258,0.0149,-0.0279,-0.0258,-0.0433,-0.0403,-0.0686,-0.0075,-0.0522,-0.0288,0.0329,-0.0133,-0.0225,-0.0446,0.0205,-0.0526,-0.0274,-0.0871,0.001,0.0162,0.0136,-0.0435,-0.0134,0.0416,-0.054,-0.0491,0.0402,0.0342,-0.0149,-0.0164,-0.0715,0.0015,-0.0098,0.118,-0.0038,0.0228,-0.009,0.0015,0.0172,-0.0004,-0.0513,-0.0197,-0.0055,-0.1131,0.0116,-0.0021,-0.0244,0.01,-0.0006,0.0154,-0.0536,0.0307,0.0259,-0.0006,0.0147,-0.0742,-0.0118,-0.0827,0.066,0.0583,0.0168,-0.01,-0.0469,0.0318,-0.001,0.0221,-0.0178,0.0086,0.0749,-0.0598,0.0363,0.0228,0.0363,-0.0255,-0.039,0.0331,-0.0185,0.0207,0.0417,0.0422,-0.0207,0.0134,-0.0582],[0.0691,-0.0428,0.0548,0.0632,0.0438,-0.0446,0.0198,0.0371,-0.0177,-0.1281,0.0472,-0.0417,-0.0717,0.0004,0.0299,0.0443,-0.05,-0.0033,0.0352,0.05,0.0224,-0.0073,-0.0251,0.1917,-0.0603,-0.0715,-0.0547,-0.0516,0.0402,-0.0086,-0.0534,-0.0442,0.0673,0.0176,-0.0411,0.0009,0.0225,-0.0094,-0.0174,-0.0788,-0.0183,0.042,0.0291,-0.0086,0.0217,0.0196,-0.0187,-0.0159,0.0297,0.059,-0.0601,0.0329,-0.0113,-0.0222,0.0269,-0.0375,0.0281,0.0078,0.0318,-0.0235,0.0104,-0.0659,-0.0233,-0.0698,0.0797,-0.1229,0.0242,-0.0384,-0.0571,-0.0149,0.047,0.1137,-0.0784,-0.0349,0.0113,0.0737,-0.0513,0.0679,-0.072,0.0138,-0.0497,0.0377,0.0172,-0.0349,0.1628,0.0188,-0.0359,-0.0122,-0.0603,0.0159,0.035,-0.0656,0.1339,-0.0501,0.0984,-0.0778,0.076,0.0142,-0.0447,-0.0701,-0.3174,-0.3955,0.4124,0.8276,-0.16,-0.2871,-0.2039,-0.0248,-0.0077,0.0699,0.011,-0.0175,0.0693,-0.0592,0.0613,-0.0699,-0.0084,-0.0693,-0.0104,-0.0409,0.0301,-0.1095,0.0333,-0.0552,0.0167,-0.0103,0.0227,0.124,-0.0525,0.0806,-0.0877,0.0037,0.0082,0.0237,0.0487,0.0344,0.0344,-0.0304,-0.1092,0.0696,0.0903,-0.0167,-0.0406,0.0312,0.0521,-0.0535,0.0272,-0.0743,0.0878,0.0162,0.046,-0.0732,-0.0187,0.0196,0.0269,-0.0066,-0.0665,0.018,0.0117,0.0695,0.015,0.003,-0.1125,0.0859,0.0071,0.0156,0.0168,0.0216,-0.0875,-0.0348,-0.0541,-0.0315,0.1035,0.0426,0.017,0.0064,0.0356,-0.0143,-0.0329,0.0108,0.0327,-0.0827,-0.0151,0.1213,-0.0141,-0.0036,-0.0893,-0.0154,0.0353,0.0509,-0.0781,0.0022,0.0322,-0.0035,-0.0602,0.0455,0.0157,0.0411,0.0283,-0.0179,0.0772,-0.0684,-0.0921,0.0472,-0.1089,-0.0413,-0.0478,0.0222,-0.0244,-0.1281,0.05,-0.0909,-0.0379,0.106,0.1554,0.0343,0.0213,-0.0514,0.0082,0.0584,-0.0109,0.0589,-0.0828,0.05,-0.0982,-0.0203,-0.1254,0.0299,-0.0004,-0.0945,0.0237,-0.021,0.0318,-0.0659,-0.0622,-0.0215,0.1299,-0.1385,-0.0427,-0.0236,0.0669,0.0467,0.027,-0.0007,0.0476,0.0178,0.0337,0.0534,-0.0638,0.0033,0.0231,-0.0406,0.0109,-0.0141,0.0678,-0.0535,-0.0909,-0.03,0.0297,-0.0751,0.1147,-0.0394,-0.0143,-0.0311,0.0139,-0.0718,0.0639,-0.0036,-0.006,-0.0643,-0.1652,0.225,0.439,-0.0254,-0.2515,-0.0396,-0.0111,0.0641,-0.0663,-0.0036,0.0003,0.0735,-0.0366,0.0472,-0.0276,0.0557,0.0301,-0.0636,0.0639,0.0341,0.1404,0.0694,-0.0025,0.0511,0.1325,-0.0061,0.078,0.0009,-0.0585,0.0069,0.0066,0.0219,-0.0422,-0.0691,-0.0625,0.0162,0.0079,0.0262,-0.1251,0.0102,-0.0471,0.0718,0.0466,-0.0012,-0.0092,-0.0238,0.0235,-0.0037,-0.0045,-0.0573,-0.0228,-0.0418,-0.0265,0.0811,0.0845,-0.0804,-0.0756,-0.0322,0.0453,-0.074,-0.0163,0.0452,-0.0171,0.0226,-0.0777,0.0912,-0.0354,0.073,-0.0508,0.0576,0.0678,0.0722,-0.0028,-0.0003,-0.0042,0.0272,-0.0141,0.0309,-0.0038,-0.0752,0.0709,-0.0478,0.095,-0.0596,0.0797,0.0406,0.0464,0.0086,0.046,-0.0234,-0.0172,0.0452,0.0195,0.0367,-0.0375,0.0043,-0.0221,0.0143,0.0657,-0.029,-0.0046,0.0398,0.099,0.051,0.0098,-0.0223,0.0877,-0.1259,0.0799,-0.0379,0.0662,0.0189,-0.0008,0.0434,-0.0357,-0.0278,0.0601,-0.0141,-0.0311,0.0036,-0.0095,0.0704,-0.0502,0.0802,-0.0903,-0.0414,0.0108,-0.0195,0.0837,-0.0171,0.0204,0.0493,0.0251,0.006,-0.0878,-0.0077,0.012,0.034,-0.0219,-0.0327,-0.0852,-0.0142,-0.1247,-0.0511,-0.0279,0.0646,0.0018,-0.071,0.0663,0.1164,-0.0234,0.0246,-0.0534,0.0559,0.0209,-0.0545,0.0427,-0.0198,-0.0363,-0.0451,0.1034,0.0017,0.0325,0.0256,-0.0099,-0.0748,0.0774,-0.0367,0.0403,0.0155,0.0223,0.0534,0.052,0.0519,0.0164,-0.0912,-0.2119,-0.4478,0.3157,1.0,-0.1777,-0.3862,-0.1518,-0.0041,0.0449,-0.0183,0.0356,0.0087,-0.0041,-0.0095,0.0581,-0.0121,0.0302,0.0759,-0.092,0.0327,0.0152,0.0234,-0.0266,0.0351,0.0497,-0.0076,0.0306,-0.0238,0.034,-0.0036,-0.0863,-0.0458,-0.0777,-0.0292,0.0017,-0.0528,0.041,-0.0194,-0.0465,-0.0087,0.0129,0.0565,-0.0356,0.014,0.0665,-0.0649,-0.0513,-0.0785,0.0377,0.0625,0.0371,-0.0228,0.0158,0.0041,-0.0445,-0.07,0.0391,-0.0639,-0.0708,0.0496,-0.0175,-0.0156,-0.0681,0.0986,0.0396,0.0713,-0.0239,-0.0142,0.0641,-0.0201,-0.0677,-0.0198,-0.0909,0.0739,0.038,0.0473,-0.0065,-0.0566,0.0578,-0.0529,-0.0349,0.063,0.0245,-0.038,-0.0555,-0.08,0.0069,-0.0125,-0.0426,-0.0487,0.0387,0.1713,0.0323,0.0549,0.0086,-0.0518,-0.0334,-0.1085,0.0375,0.0613,-0.0114,-0.0564,-0.0243,0.0791,0.0808,0.0372,-0.0441,-0.0016,-0.0159,0.0805,-0.0185,0.0024,-0.0332,-0.1166,-0.0635,0.0995,-0.0291,0.0795,-0.0614,0.1113,-0.0484,-0.0017,0.026,-0.032,-0.0163,-0.0755,0.0508,0.0258,-0.1004,0.0934,0.1272,-0.097,0.0253,-0.008,0.0563,0.0236,0.0162,-0.0072,0.0494,0.073,-0.0156,0.018,0.03,0.0744,0.0585,0.0076,-0.003,0.0955,-0.0141,-0.0001,-0.0236,-0.0807,-0.0115,-0.0757],[-0.0628,0.0158,0.0021,0.0322,0.0199,-0.0337,0.0256,-0.0414,-0.0491,-0.0085,-0.0124,-0.0608,0.0273,-0.0545,0.0432,-0.0605,0.0352,-0.0049,-0.0312,0.0261,0.0569,-0.0614,-0.0036,0.0614,0.009,0.0585,-0.0838,0.0388,-0.092,0.0013,-0.011,0.0628,0.0095,0.0,-0.0031,0.0045,0.0776,0.0034,-0.0305,-0.0105,0.0752,0.0073,-0.0275,0.0091,0.0468,0.0211,-0.001,-0.0503,-0.0428,0.0951,0.0107,-0.0451,-0.0426,0.0123,0.0016,0.0463,-0.0593,0.0883,-0.0247,-0.0644,0.0152,0.0375,-0.0215,-0.0753,0.0354,-0.0092,0.0564,-0.0306,0.0067,-0.0444,0.0219,0.0581,0.1026,0.001,-0.007,-0.0011,0.0141,-0.0108,0.0448,-0.0022,0.0057,0.0392,-0.0632,0.0387,0.0097,-0.0013,-0.0806,0.0384,-0.0288,0.0187,0.0033,-0.0027,0.0157,-0.0031,-0.0306,-0.0415,-0.0837,-0.2218,-0.3175,0.1429,0.8101,0.1387,-0.4073,-0.1972,-0.0595,0.0007,0.0287,0.1035,0.0243,0.0484,0.0552,0.0377,-0.0099,0.045,-0.0338,-0.0061,-0.0444,0.011,0.0593,-0.0051,0.0632,0.009,-0.0009,0.0205,0.0299,-0.0637,0.0721,-0.0461,0.0997,0.0174,-0.0294,0.0069,0.0135,-0.0001,-0.0322,0.0546,0.0617,0.0206,-0.0537,0.0105,0.006,0.0675,0.0395,-0.0421,-0.0275,0.0057,0.039,-0.034,-0.0036,-0.0575,0.0765,0.0429,-0.0074,-0.0721,0.0492,-0.0433,0.04,-0.0518,0.0431,-0.017,-0.0573,-0.0467,0.0415,0.0307,-0.0095,-0.0016,0.0379,0.0974,0.0276,0.0484,0.0087,-0.0032,-0.0434,-0.0125,-0.0448,-0.0371,0.0861,-0.1087,0.0006,-0.0305,0.0717,0.1323,-0.0802,-0.0414,0.0722,-0.0324,-0.0126,0.0282,-0.012,-0.0256,-0.0363,-0.049,0.0326,-0.062,-0.015,-0.0074,0.0144,0.0224,0.0347,0.0841,-0.0877,0.0319,-0.0311,0.0362,-0.0337,-0.0488,0.116,-0.0574,-0.0181,-0.0601,0.0266,-0.0052,0.0301,-0.0196,-0.0211,-0.0979,-0.0362,-0.0877,-0.0287,0.0773,-0.0142,0.0562,-0.0109,-0.0309,-0.0039,0.0428,0.0097,0.0475,0.0182,0.019,0.0261,-0.0123,0.0434,0.0025,0.0004,-0.0218,0.058,0.0594,-0.0186,-0.013,-0.0017,-0.0518,0.0141,0.0112,0.022,0.086,0.0249,0.0094,-0.0222,0.0742,-0.0189,0.0393,-0.0313,0.0256,-0.0054,-0.0045,-0.035,0.0222,0.0453,0.0648,-0.0261,-0.0399,-0.0537,-0.0486,-0.0438,-0.0247,-0.0787,-0.1649,0.0594,0.4087,0.141,-0.2414,-0.0379,-0.0619,-0.0258,0.0387,0.0265,-0.0122,-0.0392,0.0568,-0.0466,0.0079,-0.0395,-0.0234,-0.0828,0.0625,-0.0098,-0.031,0.0429,-0.0772,0.0256,-0.0246,0.0541,-0.0521,0.0385,-0.0517,0.0302,-0.0249,0.04,-0.1415,0.063,-0.0423,-0.0068,0.032,0.0226,-0.0088,0.0026,-0.0044,0.0434,0.0147,-0.0463,-0.0003,0.005,0.067,-0.0353,0.0488,-0.0294,0.0294,0.0258,-0.019,0.0025,-0.0438,-0.0307,0.0235,0.0442,0.0084,0.0584,0.0374,0.0198,-0.032,0.0605,0.0309,-0.0173,-0.007,-0.0173,0.0009,0.0224,-0.008,-0.0175,-0.0118,-0.0831,0.0389,-0.0798,-0.0142,0.0168,-0.0113,-0.0615,0.0089,0.016,-0.0021,0.0243,0.0099,0.0127,-0.0422,-0.0215,0.0499,0.032,-0.0661,0.0731,-0.0043,-0.0055,0.0445,0.0066,0.0112,-0.0198,-0.009,0.0059,0.0842,-0.0276,-0.0063,-0.0164,0.0519,-0.0367,0.0187,-0.0253,-0.1159,0.0371,0.0124,0.03,-0.0552,-0.0095,-0.0259,0.0011,0.0725,0.0381,0.0066,0.0343,-0.0243,-0.0478,0.0115,-0.0953,-0.0672,0.0285,-0.0564,0.0102,-0.0049,0.01,0.0193,-0.0138,0.0606,-0.0235,0.0067,-0.0493,-0.0033,0.0204,-0.1138,0.0496,-0.0306,-0.0383,-0.0104,-0.0352,0.0347,0.0077,-0.0373,0.004,-0.0311,0.0302,-0.1081,0.0066,-0.0275,-0.0454,-0.0024,-0.0128,0.0726,0.0594,0.0034,0.0097,0.0672,0.0292,-0.0497,-0.0359,-0.0277,-0.0668,0.0275,0.0304,-0.0325,0.0124,0.0683,0.0375,0.01,0.0534,-0.0804,0.0437,-0.1495,-0.4077,0.115,1.0,0.0787,-0.4279,-0.136,-0.0908,0.0149,0.0439,0.0198,-0.009,0.0183,0.0637,0.1096,-0.0374,0.0276,0.0525,0.0589,-0.0096,0.0308,0.0387,0.016,-0.0262,0.0747,-0.0011,0.0118,-0.019,-0.039,0.0767,-0.0214,0.0536,-0.0266,0.07,0.047,0.0052,0.0168,-0.0659,-0.024,-0.0756,0.0411,0.0122,0.1378,-0.0006,0.0695,0.0155,0.0054,0.0061,-0.0841,0.0685,-0.0031,-0.0212,0.0205,-0.0075,0.0182,0.0412,-0.0106,0.054,-0.0102,-0.0009,-0.0174,-0.018,-0.0399,0.0089,-0.0264,0.0622,0.023,0.0687,0.0985,0.0128,0.0292,-0.0896,0.0395,-0.1486,0.0149,-0.0221,-0.0024,0.0114,0.0241,0.015,0.0039,0.0599,0.0497,0.0152,-0.0479,-0.0581,-0.0493,0.037,-0.0805,0.0233,0.0144,-0.0744,-0.0216,0.0433,0.0018,0.0104,0.0592,0.0012,0.0221,0.012,0.0569,0.0293,-0.0048,-0.0054,-0.0146,0.0138,0.0073,-0.0453,-0.0217,0.0173,0.0333,0.1061,-0.0521,0.0873,-0.0414,0.0028,0.0025,0.017,0.0896,-0.0194,0.0049,0.035,0.0153,0.005,0.0368,0.0001,-0.0071,-0.0665,0.0342,0.0169,0.0096,0.0275,-0.0013,0.0488,0.0934,-0.0077,-0.0037,-0.0216,-0.0554,0.0214,-0.0355,-0.0291,-0.0624,-0.0024,-0.0157,0.0545,0.025,-0.0542,0.0022,-0.0485,0.0229,0.0174,-0.0243,0.014,0.0365,0.0331,-0.0272],[-0.0711,-0.0359,0.0232,0.0179,0.1033,-0.1335,0.1948,-0.0461,0.0689,0.0118,0.1774,0.0468,0.0354,-0.1614,0.1514,0.0481,0.0185,0.0908,-0.0047,0.0642,-0.1431,-0.0341,-0.1718,0.0943,-0.0704,-0.0513,-0.0355,0.0689,0.0413,0.093,-0.0113,0.0272,0.0079,-0.1252,-0.0198,0.0027,0.0407,0.2284,0.0884,-0.0174,0.0142,0.0736,0.0509,-0.0313,0.0075,-0.0713,0.0175,0.0005,-0.0535,0.0082,0.0166,-0.0151,-0.1199,0.0426,0.0559,0.0509,-0.1252,-0.03,0.0292,0.0807,0.0515,0.0029,-0.0118,0.068,0.0498,-0.1327,-0.0222,-0.0417,0.0349,0.0075,-0.0937,-0.0443,0.158,-0.0822,-0.0407,0.0248,-0.0291,0.1628,-0.0384,0.0397,-0.1032,-0.0379,-0.0198,-0.057,-0.0664,0.0355,-0.0088,-0.0922,-0.0611,0.0556,0.0728,-0.134,-0.0533,-0.0644,0.0066,-0.0625,0.0126,0.0266,-0.0421,-0.0951,-0.1284,-0.1555,0.0661,-0.3209,-0.4434,0.6864,0.892,-0.1311,-0.4475,-0.0758,-0.026,-0.0214,0.0996,-0.027,-0.0288,0.1112,0.0394,-0.0178,-0.0974,0.1201,0.0617,-0.0654,-0.014,0.0584,0.143,0.0032,0.035,0.0463,0.0976,-0.1607,-0.0026,-0.1831,0.0798,0.0414,-0.1304,0.0334,-0.0483,0.0437,-0.0313,0.0232,-0.0653,0.0182,0.1279,-0.0003,-0.191,0.0127,0.0017,-0.0209,0.1413,0.0581,0.1435,-0.2218,0.1599,-0.0854,0.0056,0.0566,0.0465,0.0054,0.0045,-0.0463,0.1078,0.0105,-0.0871,0.0575,0.0283,-0.0184,-0.0036,0.0719,0.0472,0.0496,-0.0814,0.1214,0.0335,-0.11,-0.1836,0.0679,0.1046,-0.0906,0.0836,-0.0665,0.03,0.0161,-0.0167,-0.0375,-0.0068,-0.0206,0.0669,0.0503,-0.0781,-0.0071,0.0388,-0.0149,-0.2069,-0.0298,-0.0251,-0.1129,-0.1524,0.1201,0.1266,-0.0327,-0.078,0.0872,0.1167,0.0388,0.1135,-0.0727,0.1316,-0.0092,0.0625,-0.1782,-0.0098,0.0401,-0.0805,-0.0757,0.0469,0.0138,0.0616,0.0132,0.0277,0.0681,-0.0966,0.0538,-0.2125,0.1155,-0.1113,0.1423,-0.078,-0.0449,0.0892,-0.1288,-0.0465,-0.1182,0.0129,-0.02,0.0791,-0.0193,0.0538,-0.0478,0.0939,0.0609,-0.1028,0.0333,0.2012,-0.054,0.1131,0.0824,0.106,0.1026,-0.1033,-0.014,-0.0365,0.0435,0.0347,-0.1197,-0.01,0.0098,-0.1173,0.0188,-0.0026,0.0585,-0.0029,-0.0887,0.0041,0.0805,-0.0037,0.0923,-0.024,-0.0021,-0.0864,0.0386,-0.1676,-0.0735,-0.1482,-0.096,0.4537,0.3679,-0.0583,-0.1771,-0.2211,0.0566,-0.0916,-0.0256,-0.0839,-0.0347,0.0126,-0.0076,-0.011,-0.084,-0.0012,0.0478,-0.1717,-0.0274,0.0867,-0.1685,0.0706,0.0183,-0.0065,0.0612,0.1463,-0.0936,0.003,-0.022,0.0837,0.0226,0.0334,-0.0539,-0.0773,0.0496,-0.1009,0.0296,0.0992,-0.0153,0.0578,-0.0615,-0.2098,0.0866,-0.0028,0.0791,-0.0836,0.035,-0.0566,-0.1221,0.0568,-0.007,0.0385,0.073,0.0854,0.1171,0.0723,-0.0033,-0.004,-0.0262,-0.0433,0.004,-0.0124,0.0686,-0.0904,0.0521,0.0637,-0.1126,0.0792,-0.0761,0.127,-0.0479,-0.046,-0.1162,-0.114,-0.0634,0.1154,0.0846,-0.0009,0.0197,0.1177,-0.0343,-0.0695,-0.0189,-0.0143,0.0041,0.0001,0.0858,-0.0485,-0.1379,-0.0381,0.0086,-0.1416,-0.0202,-0.0159,0.1152,-0.0203,0.0631,-0.1158,0.0179,0.0277,0.113,0.0817,0.0238,0.0177,-0.0363,0.0352,-0.0647,0.0286,-0.1034,-0.0352,0.0085,-0.094,-0.0256,0.0812,-0.1186,-0.0824,-0.0352,-0.0274,-0.0138,-0.215,-0.0134,0.1,0.0359,0.0547,-0.132,-0.0602,0.0457,0.0207,-0.0522,0.0207,-0.0693,0.0764,-0.0345,0.0616,-0.1714,-0.0014,0.0299,-0.0809,-0.0935,-0.0061,-0.0768,-0.0183,-0.0196,0.0093,-0.118,-0.0223,0.1135,0.0788,0.1212,-0.1775,-0.0009,0.0358,0.0215,-0.0111,-0.0655,-0.0286,0.0803,0.0862,0.0478,-0.1034,0.002,0.0974,-0.2322,0.0594,-0.1007,0.0202,0.0048,0.0376,-0.0412,-0.044,-0.0418,-0.0558,0.1,-0.0061,0.0085,-0.0646,-0.3205,-0.5278,0.7953,1.0,-0.4185,-0.483,-0.053,-0.1013,-0.0684,-0.1047,0.0538,0.0579,0.0958,0.0819,-0.0519,0.0452,-0.2332,0.0672,0.0401,0.1252,-0.0295,-0.0384,0.0757,-0.058,-0.1204,-0.0335,-0.029,-0.0996,-0.0081,-0.0779,-0.0045,-0.1654,-0.0902,-0.0148,0.1122,0.0344,0.0269,-0.0545,0.0298,0.0242,0.1095,0.098,-0.0604,-0.0789,0.0515,0.0979,-0.0688,0.0463,0.1079,-0.0284,-0.032,0.188,0.0474,0.0852,0.0432,-0.0717,-0.1416,-0.1517,0.024,-0.0768,0.0197,0.0845,-0.0115,-0.091,-0.0975,0.0153,-0.0012,-0.0807,-0.0596,0.0837,-0.0415,0.0256,0.0072,-0.1127,-0.1097,0.0551,-0.1258,-0.0718,0.0662,0.1594,-0.1037,0.0359,0.1046,0.1493,0.1389,0.0852,0.0664,0.0925,0.0282,-0.1815,-0.0408,0.0045,-0.1473,-0.0106,0.0076,-0.0181,0.0103,0.0624,-0.1112,-0.016,0.0335,0.1359,-0.024,-0.0519,-0.0104,-0.0441,0.0308,-0.0484,0.0531,0.1563,-0.166,-0.0559,-0.0053,0.0819,-0.0644,-0.0456,-0.0483,-0.0101,0.2124,0.2416,0.0746,0.0728,-0.0561,-0.1506,0.0136,-0.0208,-0.1059,0.1518,0.0987,-0.0572,-0.0237,-0.026,0.0936,-0.0732,0.1183,-0.0274,0.1414,-0.0203,-0.0027,-0.0002,-0.0223,0.0124,-0.0177,-0.073,0.0321,0.0423,-0.0193,-0.0594,-0.0103,-0.0165,0.071]];
  var FFT_M=[0.0451,0.0454,0.0233,0.055,0.1053,0.1254,0.0856,0.0488,0.0764,0.1704,0.2333,0.2485,0.2805,0.2846,0.2714,0.3052,0.3891,0.3986,0.3811,0.4155,0.4567,0.48,0.5081,0.5525,0.5932,0.6485,0.6896,0.671,0.6836,0.8083,0.8536,0.7972,0.7912,0.8382,0.9106,0.9467,0.9392,0.9728,1.0,0.9503,0.9458,0.9779,0.9505,0.9237,0.8912,0.8402,0.879,0.9343,0.8929,0.8368,0.8107,0.7685,0.701,0.6972,0.7208,0.7213,0.6842,0.6743,0.6856,0.6204,0.5938,0.5993,0.561,0.5672,0.5928,0.5808,0.5233,0.4315,0.3898,0.3824,0.3772,0.3879,0.4061,0.3599,0.2858,0.2582,0.2603,0.2725,0.2326,0.1619,0.1983,0.2507,0.2138,0.1831,0.1708,0.14,0.0989,0.0496,0.0401,0.0842,0.0963,0.0866,0.0918,0.0775,0.2445,0.5713,0.4481,0.154,0.1009,0.1129,0.1094,0.0248,0.0124,0.0388,0.068,0.1077,0.1307,0.1213,0.0318,0.0717,0.0994,0.0629,0.0812,0.0964,0.0392,0.0382,0.0409,0.0997,0.1081,0.0927,0.0582,0.0287,0.0705,0.1401,0.2985,0.1409,0.0823,0.0796,0.1291,0.0895,0.0799,0.0897,0.0312,0.0178,0.05,0.0418,0.0636,0.0745,0.0407,0.0113,0.0296,0.0703,0.0392,0.0106,0.0888,0.1113,0.0642,0.0508,0.0342,0.0557,0.0411,0.0361,0.0288,0.037,0.0386,0.0305,0.0676,0.2545,0.3143,0.0571,0.1013,0.0302,0.0642,0.0625,0.036,0.0219,0.0406,0.057,0.1092,0.0587,0.0997,0.0836,0.0639,0.0624,0.0697,0.0178,0.0334,0.0708,0.1247,0.0665,0.0423,0.0673,0.049,0.0643,0.0564,0.0427,0.0871,0.0814,0.0305,0.0525,0.0338,0.0387,0.0698,0.0647,0.0412,0.0554,0.077,0.0721,0.0171,0.0652,0.0834,0.0166,0.0651,0.0665];
  var LABELS=['GA-S01 Norte','GA-S02 Sur','GA-S03 Este','GA-S04 Oeste'];
  var EVTS=[4.85,13.30,22.15];
  var DUR=30,N=600,NFFT=200,FMAX=20;

  var C='#0a0a08',C2='#0f0f0c',GR='#1e1e16',AC='#c8a84a',T='#5a5648',T2='#8a8670',RD='rgba(138,58,42,',GN='rgba(74,106,58,';

  panel.innerHTML='';

  // ── Sismograma ──────────────────────────────────────────────────
  var seisDiv=document.createElement('div');
  seisDiv.className='seis-block';
  var seisLabel=document.createElement('div');
  seisLabel.className='seis-block-label';
  seisLabel.textContent='SISMOGRAMA — 4 CANALES / VENTANA 30 s — GA-EXP-001';
  var seisCv=document.createElement('canvas');
  seisCv.style.cssText='width:100%;display:block;';
  seisDiv.appendChild(seisLabel); seisDiv.appendChild(seisCv);
  panel.appendChild(seisDiv);

  // ── Espectro FFT ────────────────────────────────────────────────
  var fftDiv=document.createElement('div');
  fftDiv.className='seis-block';
  var fftLabel=document.createElement('div');
  fftLabel.className='seis-block-label';
  fftLabel.textContent='ANÁLISIS ESPECTRAL — FFT (Hann) / CANAL GA-S01 / 0–20 Hz';
  var fftCv=document.createElement('canvas');
  fftCv.style.cssText='width:100%;display:block;';
  fftDiv.appendChild(fftLabel); fftDiv.appendChild(fftCv);
  panel.appendChild(fftDiv);

  // ── Tabla de parámetros ─────────────────────────────────────────
  var tblDiv=document.createElement('div');
  tblDiv.className='seis-params';
  tblDiv.innerHTML=
    '<div class="seis-params-title">Parámetros derivados — cálculo automático</div>'+
    '<table class="seis-params-table">'+
      '<thead><tr><th>Parámetro</th><th>Valor</th><th>Método</th></tr></thead>'+
      '<tbody>'+
        '<tr><td>Frecuencia dominante f₀</td><td class="sp-val">3.9 ± 0.2 Hz</td><td>Máximo espectral — Ventana Hann 1024 pts</td></tr>'+
        '<tr><td>Velocidad de desplazamiento</td><td class="sp-val">0.28 m/s</td><td>Δt entre GA-S01/GA-S04 (0.43 s) · d estimada ≈ 120 m</td></tr>'+
        '<tr><td>Profundidad estimada</td><td class="sp-val">1.2 – 2.1 m</td><td>Decaimiento de amplitud A(r)=A₀·e^(−αr)/√r · α=0.072 m⁻¹</td></tr>'+
        '<tr><td>Λ atenuación superficial</td><td class="sp-val">0.072 m⁻¹</td><td>Regresión log-lineal entre canales: ln(A·√r) vs r</td></tr>'+
        '<tr><td>Eventos en ventana</td><td class="sp-val">3 (EVT-01, 02, 03)</td><td>Detección umbral: |A| &gt; 3σ ruido de fondo</td></tr>'+
        '<tr><td>Intervalo inter-evento</td><td class="sp-val">8.45 s / 8.85 s</td><td>t₂−t₁ / t₃−t₂ — no periódico, patrón irregular</td></tr>'+
        '<tr><td>Piso de ruido (rms)</td><td class="sp-val">σ = 0.032 u.a.</td><td>Ventanas sin evento — ruido Gaussiano + tráfico 9–15 Hz</td></tr>'+
      '</tbody>'+
    '</table>';
  panel.appendChild(tblDiv);

  function render(){
    var W=panel.clientWidth||800;

    // ── Draw seismogram ─────────────────────────────────────────
    var LW=112, RW=8, PTop=22, PBot=28, TH=78, SH=PTop+4*TH+PBot;
    seisCv.width=W; seisCv.height=SH;
    var s=seisCv.getContext('2d');
    s.fillStyle=C; s.fillRect(0,0,W,SH);
    var pW=W-LW-RW;

    // Grid + time axis
    for(var ti=0;ti<=30;ti+=5){
      var gx=LW+(ti/DUR)*pW;
      s.strokeStyle=GR; s.lineWidth=0.5;
      s.beginPath(); s.moveTo(gx,PTop); s.lineTo(gx,SH-PBot); s.stroke();
      s.fillStyle=T; s.font='10px monospace'; s.textAlign='center';
      s.fillText(ti+'s',gx,SH-10);
    }

    // Event markers
    EVTS.forEach(function(et,ei){
      var ex=LW+(et/DUR)*pW;
      s.save(); s.strokeStyle='rgba(200,168,74,0.22)'; s.lineWidth=1; s.setLineDash([2,4]);
      s.beginPath(); s.moveTo(ex,PTop-2); s.lineTo(ex,SH-PBot); s.stroke();
      s.restore();
      s.fillStyle='rgba(200,168,74,0.7)'; s.font='9px monospace'; s.textAlign='center';
      s.fillText('EVT-0'+(ei+1),ex,PTop-4);
    });

    // Channels
    CH.forEach(function(ch,ci){
      var my=PTop+ci*TH+TH/2, hh=TH/2*0.82;
      if(ci%2===0){s.fillStyle='rgba(255,255,255,0.01)'; s.fillRect(LW,PTop+ci*TH,pW,TH);}
      // horizontal baseline
      s.strokeStyle=GR; s.lineWidth=0.5;
      s.beginPath(); s.moveTo(LW,my); s.lineTo(W-RW,my); s.stroke();
      // label
      s.fillStyle=T2; s.font='10px monospace'; s.textAlign='left';
      s.fillText(LABELS[ci],4,my+4);
      // waveform
      s.strokeStyle=AC; s.lineWidth=1; s.beginPath();
      for(var i=0;i<N;i++){
        var wx=LW+(i/(N-1))*pW, wy=my-ch[i]*hh;
        i===0?s.moveTo(wx,wy):s.lineTo(wx,wy);
      }
      s.stroke();
    });

    // ── Draw FFT ────────────────────────────────────────────────
    var FL=50, FR=14, FT=28, FB=30, FH=170;
    fftCv.width=W; fftCv.height=FH;
    var f=fftCv.getContext('2d');
    f.fillStyle=C2; f.fillRect(0,0,W,FH);
    var fw=W-FL-FR, fh=FH-FT-FB;

    // Traffic noise band
    var tx1=FL+(9/FMAX)*fw, tx2=FL+(15.5/FMAX)*fw;
    f.fillStyle=RD+'0.1)'; f.fillRect(tx1,FT,tx2-tx1,fh);
    f.fillStyle=RD+'0.45)'; f.font='9px monospace'; f.textAlign='center';
    f.fillText('ruido vehicular 9–15 Hz',(tx1+tx2)/2,FT+11);

    // Peak highlight band
    var px1=FL+(3.5/FMAX)*fw, px2=FL+(4.5/FMAX)*fw;
    f.fillStyle='rgba(200,168,74,0.07)'; f.fillRect(px1,FT,px2-px1,fh);

    // Grid
    for(var fi=0;fi<=20;fi+=5){
      var gx2=FL+(fi/FMAX)*fw;
      f.strokeStyle=GR; f.lineWidth=0.5;
      f.beginPath(); f.moveTo(gx2,FT); f.lineTo(gx2,FT+fh); f.stroke();
      f.fillStyle=T; f.font='10px monospace'; f.textAlign='center';
      f.fillText(fi+' Hz',gx2,FH-8);
    }
    for(var vi=0;vi<=1;vi+=0.5){
      var gy=FT+fh-vi*fh;
      f.strokeStyle=GR; f.lineWidth=0.5;
      f.beginPath(); f.moveTo(FL,gy); f.lineTo(FL+fw,gy); f.stroke();
      f.fillStyle=T; f.font='9px monospace'; f.textAlign='right';
      f.fillText(vi.toFixed(1),FL-4,gy+3);
    }

    // FFT fill
    f.beginPath(); f.moveTo(FL,FT+fh);
    FFT_M.forEach(function(v,i){
      var x=FL+(i/(NFFT-1))*fw*(FMAX/FMAX), y=FT+fh-v*fh;
      f.lineTo(FL+(FMAX*i/NFFT/FMAX)*fw,y);
    });
    f.lineTo(FL+fw,FT+fh); f.closePath();
    f.fillStyle=GN+'0.18)'; f.fill();

    // FFT line
    f.strokeStyle='rgba(74,106,58,0.9)'; f.lineWidth=1.5; f.beginPath();
    FFT_M.forEach(function(v,i){
      var x=FL+(FMAX*i/NFFT/FMAX)*fw, y=FT+fh-v*fh;
      i===0?f.moveTo(x,y):f.lineTo(x,y);
    });
    f.stroke();

    // Peak annotation
    var peakX=FL+(3.9/FMAX)*fw, peakY=FT+fh-(FFT_M[40]||0.97)*fh;
    f.strokeStyle='rgba(200,168,74,0.5)'; f.lineWidth=0.8; f.setLineDash([2,3]);
    f.beginPath(); f.moveTo(peakX,peakY); f.lineTo(peakX,FT+fh); f.stroke();
    f.setLineDash([]);
    f.fillStyle=AC; f.font='bold 9px monospace'; f.textAlign='center';
    f.fillText('▲ 3.9 Hz',peakX,peakY-14);
    f.fillStyle='rgba(200,168,74,0.6)'; f.font='8px monospace';
    f.fillText('V. bituminosus',peakX,peakY-4);
    // axis label
    f.fillStyle=T2; f.font='9px monospace'; f.textAlign='left';
    f.save(); f.translate(11,FT+fh/2); f.rotate(-Math.PI/2);
    f.fillText('Amplitud norm.',0,0); f.restore();
  }

  render();
  window.addEventListener('resize', render);
  document.addEventListener('nav', render);
}

// ── Narrator radio effect (Web Audio API) ──────────────────────
function initNarratorRadioEffect(){
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx) return;
  document.querySelectorAll('.audio-evidence-item.featured audio').forEach(function(audio){
    var hooked = false;
    function buildChain(){
      if(hooked) return;
      hooked = true;
      try {
        var ctx = new AudioCtx();
        var src = ctx.createMediaElementSource(audio);

        // 1. Highpass — cut below 480 Hz (kill body/warmth)
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 480;
        hp.Q.value = 1.2;

        // 2. Tape-saturation distortion (soft-knee waveshaper)
        var dist = ctx.createWaveShaper();
        var curve = new Float32Array(512);
        for(var i=0;i<512;i++){
          var x = (i*2)/512 - 1;
          curve[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x));
        }
        dist.curve = curve;
        dist.oversample = '4x';

        // 3. Mid-range presence boost ~1.4 kHz (nasal radio character)
        var peak = ctx.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = 1400;
        peak.gain.value = 9;
        peak.Q.value = 2.2;

        // 4. Lowpass — cut above 3000 Hz (narrow the band further)
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        lp.Q.value = 1.0;

        // 5. Output gain
        var gain = ctx.createGain();
        gain.gain.value = 1.4;

        // Main signal chain
        src.connect(hp);
        hp.connect(dist);
        dist.connect(peak);
        peak.connect(lp);
        lp.connect(gain);
        gain.connect(ctx.destination);

        // 6. Static noise layer — filtered white noise mixed in
        var bufLen = ctx.sampleRate * 3;
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var nd = noiseBuf.getChannelData(0);
        for(var j=0;j<bufLen;j++) nd[j] = Math.random()*2 - 1;
        var noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuf;
        noiseNode.loop = true;
        // Band-pass the noise to radio range so it blends, not just hisses
        var nbp = ctx.createBiquadFilter();
        nbp.type = 'bandpass';
        nbp.frequency.value = 2200;
        nbp.Q.value = 0.6;
        var noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.055;
        noiseNode.connect(nbp);
        nbp.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // Start noise only while audio is playing
        audio.addEventListener('play', function(){
          if(ctx.state === 'suspended') ctx.resume();
          try{ noiseNode.start(); } catch(e){}
        }, {once: true});
        audio.addEventListener('pause', function(){ noiseGain.gain.value = 0; });
        audio.addEventListener('play',  function(){ noiseGain.gain.value = 0.055; });

        if(ctx.state === 'suspended') ctx.resume();
      } catch(e){}
    }
    // Hook on first play interaction (bypass browser autoplay policy)
    var wrapper = audio.closest('.sm-player');
    if(!wrapper) return;
    var btn = wrapper.querySelector('.sm-play-btn');
    var bar = wrapper.querySelector('.sm-bar');
    if(btn) btn.addEventListener('click', buildChain);
    if(bar) bar.addEventListener('click', buildChain);
  });
}

// ── Init on load and SPA navigation ────────────────────────────
function init(){
  initTagFilter();
  initThreatOverlay();
  initAudioPlayers();
  initNarratorRadioEffect();
  buildInstitutionalFooter();
  initSeismicPanel();
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
