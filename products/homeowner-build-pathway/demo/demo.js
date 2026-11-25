// HBPD public sample project: guide mode, stage switching and checklist "next action".
// Nothing is sent anywhere. Only the Quick/Detailed choice is remembered, in this browser.
(function () {
  var KEY = 'hbpd-demo-guide-mode';
  var body = document.body;

  // ---- Quick / Detailed guide ----
  function setMode(mode) {
    body.setAttribute('data-mode', mode);
    document.querySelectorAll('input[name="guide-mode"]').forEach(function (r) { r.checked = r.value === mode; });
    try { localStorage.setItem(KEY, mode); } catch (e) { /* storage unavailable */ }
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  setMode(saved === 'detailed' ? 'detailed' : 'quick');
  document.querySelectorAll('input[name="guide-mode"]').forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) setMode(r.value); });
  });

  // ---- One sample stage at a time ----
  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.stage-tabs a'));
  if (!stages.length) return;
  document.documentElement.classList.add('js-stages');

  function show(num, scroll) {
    var target = document.getElementById('stage-' + num);
    if (!target) return false;
    stages.forEach(function (s) { s.hidden = s !== target; });
    tabs.forEach(function (t) {
      if (t.getAttribute('data-goto') === String(num)) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
    if (scroll) {
      // Scroll to the controls so the Quick/Detailed switch stays in view.
      var controls = document.querySelector('.demo-controls') || target;
      controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var h = target.querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    return true;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-goto]');
    if (!link) return;
    e.preventDefault();
    var num = link.getAttribute('data-goto');
    show(num, true);
    try { history.replaceState(null, '', '#stage-' + num); } catch (err) { /* ignore */ }
  });

  var m = /^#stage-(\d+)$/.exec(location.hash);
  if (!(m && show(m[1], true))) show(stages[0].id.replace('stage-', ''), false);

  // ---- Checklist updates "What to do next", like the app's Quick guide ----
  document.querySelectorAll('[data-next-action]').forEach(function (out) {
    var group = out.getAttribute('data-next-action');
    var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-checklist="' + group + '"]'));
    function update() {
      var next = boxes.filter(function (b) { return !b.checked; })[0];
      out.textContent = next ? next.value : 'All checklist items are ticked.';
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
  });
})();
