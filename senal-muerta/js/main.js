// Señal Muerta — interactividad principal

document.querySelectorAll('audio[data-loop-delay]').forEach(function (audio) {
  var delay = parseInt(audio.dataset.loopDelay, 10) || 2500;
  audio.addEventListener('ended', function () {
    setTimeout(function () {
      audio.currentTime = 0;
      audio.play();
    }, delay);
  });
});

function switchVersion(v) {
  document.querySelectorAll('.version-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.version-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + v).classList.add('active');
  document.querySelectorAll('.version-btn')[v === 'a' ? 0 : 1].classList.add('active');
  try { localStorage.setItem('sm-version', v); } catch(e) {}
  window.scrollTo(0, 0);
}

try {
  var saved = localStorage.getItem('sm-version');
  if (saved && document.getElementById('panel-' + saved)) switchVersion(saved);
} catch(e) {}

function buildChapterNav() {
  var allTabs = document.querySelectorAll('.chapter-tabs .chapter-tab');
  var chapterTabs = [];
  var activeIdx = -1;

  for (var i = 0; i < allTabs.length; i++) {
    var href = allTabs[i].getAttribute('href') || '';
    if (/^cap-\d+\.html$/.test(href)) {
      if (allTabs[i].classList.contains('active')) activeIdx = chapterTabs.length;
      chapterTabs.push(allTabs[i]);
    }
  }

  if (activeIdx === -1 || chapterTabs.length <= 1) return;

  var nav = document.createElement('div');
  nav.className = 'chapter-nav';

  if (activeIdx > 0) {
    var aPrev = document.createElement('a');
    aPrev.href = chapterTabs[activeIdx - 1].getAttribute('href');
    aPrev.className = 'chapter-nav-link prev';
    aPrev.textContent = '← ' + chapterTabs[activeIdx - 1].textContent.trim();
    nav.appendChild(aPrev);
  }

  if (activeIdx < chapterTabs.length - 1) {
    var aNext = document.createElement('a');
    aNext.href = chapterTabs[activeIdx + 1].getAttribute('href');
    aNext.className = 'chapter-nav-link next';
    aNext.textContent = chapterTabs[activeIdx + 1].textContent.trim() + ' →';
    nav.appendChild(aNext);
  }

  var footer = document.querySelector('.page-footer');
  if (footer) footer.parentNode.insertBefore(nav, footer);
}

buildChapterNav();

function buildChapterFooter() {
  var allTabs = document.querySelectorAll('.chapter-tabs .chapter-tab');
  var chapterTabs = [];
  var activeIdx = -1;

  for (var i = 0; i < allTabs.length; i++) {
    var href = allTabs[i].getAttribute('href') || '';
    if (/^cap-\d+\.html$/.test(href)) {
      if (allTabs[i].classList.contains('active')) activeIdx = chapterTabs.length;
      chapterTabs.push(allTabs[i]);
    }
  }

  if (activeIdx === -1 || !chapterTabs.length) return;

  var charMatch = allTabs[0] && allTabs[0].textContent.trim().match(/^(F-\d+)/);
  var prefix = charMatch ? charMatch[1] + ' / ' : '';
  var text = prefix + 'Capítulo ' + (activeIdx + 1) + ' de ' + chapterTabs.length;

  var footerSpans = document.querySelectorAll('.page-footer > span');
  if (footerSpans[1]) footerSpans[1].textContent = text;
}

buildChapterFooter();

function switchChapter(version, num) {
  const panel = document.getElementById('panel-' + version);
  panel.querySelectorAll('.chapter-content').forEach(c => c.classList.remove('active'));
  panel.querySelectorAll('.chapter-tab, .chapter-btn-b').forEach(b => b.classList.remove('active'));
  document.getElementById(version + '-cap' + num).classList.add('active');
  const tabs = panel.querySelectorAll('.chapter-tab, .chapter-btn-b');
  if (tabs[num - 1]) tabs[num - 1].classList.add('active');
  window.scrollTo(0, 0);
}

// ── Global site nav ──────────────────────────────────────────────
function buildGlobalNav() {
  var cssLink = document.querySelector('link[href*="style.css"]');
  if (!cssLink) return;
  var cssHref = cssLink.getAttribute('href');
  var depth = cssHref.indexOf('../../') === 0 ? 2 : 1;
  var root    = depth === 2 ? '../../../index.html' : '../../index.html';
  var base    = depth === 2 ? '../../' : '../';
  var path    = window.location.pathname.toLowerCase();

  var nav = document.createElement('nav');
  nav.className = 'site-nav';

  var links = [
    { label: 'Personajes',  href: root,                        active: path.indexOf('/personajes') !== -1 },
    { label: 'Bestiario',   href: base + 'bestiario/',         active: path.indexOf('/bestiario')  !== -1 },
    { label: 'Cartografía', href: base + 'cartografia/',       active: path.indexOf('/cartografia') !== -1 },
    { label: 'Cronología',  href: base + 'cronologia/',        active: path.indexOf('/cronologia')  !== -1, disabled: true }
  ];

  links.forEach(function (l) {
    var a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.label;
    if (l.active)   a.classList.add('nav-active');
    if (l.disabled) a.classList.add('nav-disabled');
    nav.appendChild(a);
  });

  var inner  = document.querySelector('.site-header-inner');
  if (!inner) return;
  var toggle = inner.querySelector('.version-toggle');
  if (toggle) inner.insertBefore(nav, toggle);
  else        inner.appendChild(nav);
}

// ── Breadcrumb ───────────────────────────────────────────────────
function buildBreadcrumb() {
  var cssLink = document.querySelector('link[href*="style.css"]');
  if (!cssLink) return;
  var depth = cssLink.getAttribute('href').indexOf('../../') === 0 ? 2 : 1;
  var root  = depth === 2 ? '../../../index.html' : '../../index.html';

  var parts = document.title.split(' — ').map(function (s) { return s.trim(); });
  if (parts[parts.length - 1] === 'Señal Muerta') parts.pop();

  var crumbs = [{ label: 'Archivo', href: root }];

  if (depth === 1) {
    if (parts.length === 1) {
      crumbs.push({ label: parts[0] });
    } else {
      var section = parts[parts.length - 1];
      crumbs.push({ label: section, href: 'index.html' });
      if (parts[0] !== section) crumbs.push({ label: parts[0] });
    }
  } else {
    var firstTab  = document.querySelector('.chapter-tabs .chapter-tab');
    var activeTab = document.querySelector('.chapter-tabs .chapter-tab.active');
    if (firstTab) {
      var charLabel = firstTab.textContent.trim();
      var charHref  = firstTab.getAttribute('href') || 'index.html';
      crumbs.push({ label: charLabel, href: charHref });
      if (activeTab && activeTab !== firstTab) {
        crumbs.push({ label: activeTab.textContent.trim() });
      }
    } else {
      crumbs.push({ label: parts[0] });
    }
  }

  var bc = document.createElement('div');
  bc.className = 'breadcrumb';

  crumbs.forEach(function (c, i) {
    if (i > 0) {
      var sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = '/';
      bc.appendChild(sep);
    }
    if (c.href) {
      var a = document.createElement('a');
      a.href = c.href;
      a.textContent = c.label;
      bc.appendChild(a);
    } else {
      var sp = document.createElement('span');
      sp.className = 'breadcrumb-current';
      sp.textContent = c.label;
      bc.appendChild(sp);
    }
  });

  var container = document.querySelector('.container');
  if (container) container.insertBefore(bc, container.firstChild);
}

// ── Threat overlay for Amenaza III / IV ──────────────────────────
function initThreatOverlay() {
  var threat = document.body.dataset.threat;
  if (!threat || (threat !== 'III' && threat !== 'IV')) return;

  var key = 'sm-threat-' + window.location.pathname;
  try { if (sessionStorage.getItem(key)) return; } catch (e) {}

  var msgs = {
    'III': {
      badge: 'Amenaza III — Prioridad crítica',
      title: 'Acceso restringido — Documentación clasificada',
      body:  'Esta entrada contiene datos operativos de una especie con capacidad letal confirmada. ' +
             'La lectura de este archivo implica comprensión del protocolo de seguridad establecido para Amenaza III.',
      btn:   'Confirmar acceso — Acepto protocolo operativo'
    },
    'IV': {
      badge: 'Amenaza IV — Clase Extinción',
      title: 'Advertencia de clasificación máxima',
      body:  'Esta entrada contiene información sobre una entidad de Clase Extinción. ' +
             'Los datos disponibles son incompletos. No hay registro de supervivencia documentada de encuentro cercano.',
      btn:   'Confirmar acceso — Autorización Nivel ██ aceptada'
    }
  };
  var m = msgs[threat];

  var overlay = document.createElement('div');
  overlay.className = 'threat-overlay';
  overlay.innerHTML =
    '<div class="threat-overlay-inner">' +
      '<div class="threat-level-badge">' + m.badge + '</div>' +
      '<h2>' + m.title + '</h2>' +
      '<p>' + m.body + '</p>' +
      '<button class="threat-access-btn">' + m.btn + '</button>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('.threat-access-btn').addEventListener('click', function () {
    overlay.remove();
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
  });
}

// ── Tag filter for bestiario index ───────────────────────────────
function initTagFilter() {
  var filterEl = document.getElementById('bestiario-tag-filter');
  if (!filterEl) return;

  var buttons  = filterEl.querySelectorAll('.tag-btn[data-filter]');
  var entries  = document.querySelectorAll('.entry-item[data-tags]');
  var allBtn   = filterEl.querySelector('.tag-btn[data-filter="all"]');

  function applyFilter() {
    var active = Array.from(filterEl.querySelectorAll('.tag-btn.active:not([data-filter="all"])'))
                      .map(function (b) { return b.dataset.filter; });

    entries.forEach(function (e) {
      if (!active.length) { e.style.display = ''; return; }
      var tags = (e.dataset.tags || '').split(',').map(function (t) { return t.trim(); });
      e.style.display = active.some(function (f) { return tags.indexOf(f) !== -1; }) ? '' : 'none';
    });

    document.querySelectorAll('.entry-grid').forEach(function (grid) {
      var visible = Array.from(grid.querySelectorAll('.entry-item')).some(function (e) {
        return e.style.display !== 'none';
      });
      grid.style.display = visible ? '' : 'none';
      var stamp = grid.previousElementSibling;
      if (stamp && stamp.classList.contains('archive-stamp')) stamp.style.display = visible ? '' : 'none';
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.filter === 'all') {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        entries.forEach(function (e) { e.style.display = ''; });
        document.querySelectorAll('.entry-grid, .archive-stamp').forEach(function (el) { el.style.display = ''; });
        return;
      }
      if (allBtn) allBtn.classList.remove('active');
      btn.classList.toggle('active');
      var anyActive = Array.from(filterEl.querySelectorAll('.tag-btn.active:not([data-filter="all"])')).length > 0;
      if (!anyActive && allBtn) allBtn.classList.add('active');
      applyFilter();
    });
  });
}

// ── Institutional footer ─────────────────────────────────────────
function buildInstitutionalFooter() {
  var footer = document.querySelector('.page-footer');
  if (!footer) return;
  var inst = document.createElement('div');
  inst.className = 'institutional-footer';
  inst.innerHTML =
    '<strong>APE — Señal Muerta</strong> / Archivo de Recuperación Post-Emergencia<br>' +
    'Clasificación: Clase C — Testimonial &nbsp;·&nbsp; No distribuir fuera de perímetro autorizado<br>' +
    'Los documentos contenidos en este archivo son testimonios recuperados. ' +
    'La veracidad de su contenido no ha sido verificada de forma independiente.<br>' +
    'Protocolo <span class="redacted" style="font-size:10px">███</span>-C activo — ' +
    'Comité de Preservación <span class="redacted" style="font-size:10px">████████</span>';
  footer.parentNode.insertBefore(inst, footer.nextSibling);
}

// ── Custom audio player ──────────────────────────────────────────
function initAudioPlayers() {
  function fmt(s) {
    if (!isFinite(s) || isNaN(s)) return '--:--';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  document.querySelectorAll('audio').forEach(function (audio) {
    var wrapper = document.createElement('div');
    wrapper.className = 'sm-player';
    wrapper.dataset.state = 'paused';

    var playBtn = document.createElement('button');
    playBtn.className = 'sm-play-btn';
    playBtn.setAttribute('aria-label', 'Play / Pause');
    playBtn.textContent = '▶';

    var track = document.createElement('div');
    track.className = 'sm-track';

    var bar = document.createElement('div');
    bar.className = 'sm-bar';
    var barFill = document.createElement('div');
    barFill.className = 'sm-bar-fill';
    var barCur = document.createElement('div');
    barCur.className = 'sm-bar-cursor';
    bar.appendChild(barFill);
    bar.appendChild(barCur);

    var timeRow = document.createElement('div');
    timeRow.className = 'sm-time';
    var timeCur = document.createElement('span');
    timeCur.className = 'sm-time-cur';
    timeCur.textContent = '0:00';
    var timeSep = document.createElement('span');
    timeSep.className = 'sm-time-sep';
    timeSep.textContent = '/';
    var timeDur = document.createElement('span');
    timeDur.className = 'sm-time-dur';
    timeDur.textContent = '--:--';
    timeRow.appendChild(timeCur);
    timeRow.appendChild(timeSep);
    timeRow.appendChild(timeDur);

    track.appendChild(bar);
    track.appendChild(timeRow);

    var signal = document.createElement('div');
    signal.className = 'sm-signal';
    for (var i = 0; i < 5; i++) signal.appendChild(document.createElement('span'));

    wrapper.appendChild(playBtn);
    wrapper.appendChild(track);
    wrapper.appendChild(signal);

    audio.parentNode.insertBefore(wrapper, audio);
    wrapper.appendChild(audio);

    audio.addEventListener('loadedmetadata', function () {
      timeDur.textContent = fmt(audio.duration);
    });

    audio.addEventListener('timeupdate', function () {
      var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      barFill.style.width = pct + '%';
      barCur.style.left = pct + '%';
      timeCur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('ended', function () {
      wrapper.dataset.state = 'paused';
      playBtn.textContent = '▶';
    });

    playBtn.addEventListener('click', function () {
      if (audio.paused) {
        document.querySelectorAll('.sm-player').forEach(function (p) {
          var a = p.querySelector('audio');
          if (a && a !== audio) {
            a.pause();
            p.dataset.state = 'paused';
            p.querySelector('.sm-play-btn').textContent = '▶';
          }
        });
        audio.play();
        wrapper.dataset.state = 'playing';
        playBtn.textContent = '▌▌';
      } else {
        audio.pause();
        wrapper.dataset.state = 'paused';
        playBtn.textContent = '▶';
      }
    });

    bar.addEventListener('click', function (e) {
      if (!audio.duration) return;
      var rect = bar.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  });
}

// ── Init all ─────────────────────────────────────────────────────
buildGlobalNav();
buildBreadcrumb();
initThreatOverlay();
initTagFilter();
buildInstitutionalFooter();
initAudioPlayers();
