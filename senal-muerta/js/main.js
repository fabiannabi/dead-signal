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
  localStorage.setItem('sm-version', v);
  window.scrollTo(0, 0);
}

(function () {
  var saved = localStorage.getItem('sm-version');
  if (saved && document.getElementById('panel-' + saved)) switchVersion(saved);
})();

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
