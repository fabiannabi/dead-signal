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
  window.scrollTo(0, 0);
}

function switchChapter(version, num) {
  const panel = document.getElementById('panel-' + version);
  panel.querySelectorAll('.chapter-content').forEach(c => c.classList.remove('active'));
  panel.querySelectorAll('.chapter-tab, .chapter-btn-b').forEach(b => b.classList.remove('active'));
  document.getElementById(version + '-cap' + num).classList.add('active');
  const tabs = panel.querySelectorAll('.chapter-tab, .chapter-btn-b');
  if (tabs[num - 1]) tabs[num - 1].classList.add('active');
  window.scrollTo(0, 0);
}
