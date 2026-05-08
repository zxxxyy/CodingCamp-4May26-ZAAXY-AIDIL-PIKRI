/* =============================================
   LIFE DASHBOARD — app.js
   Vanilla JS | Local Storage | No frameworks
   ============================================= */

'use strict';

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — fail silently
  }
}

/** Show a brief toast message */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}


// ─── ONBOARDING ──────────────────────────────────────────────────────────────

(function initOnboarding() {
  const banner = document.getElementById('onboarding');
  const closeBtn = document.getElementById('onboarding-close');

  // Hide if already dismissed
  if (storageGet('dashboard_onboarding_done', false)) {
    banner.classList.add('hidden');
    return;
  }

  closeBtn.addEventListener('click', () => {
    banner.classList.add('hidden');
    storageSet('dashboard_onboarding_done', true);
  });
})();


// ─── CLOCK & GREETING ────────────────────────────────────────────────────────

(function initClock() {
  const timeEl     = document.getElementById('current-time');
  const dateEl     = document.getElementById('current-date');
  const greetingEl = document.getElementById('greeting-text');

  const greetings = [
    { from: 5,  to: 12, text: 'Good morning ☀️' },
    { from: 12, to: 17, text: 'Good afternoon 🌤️' },
    { from: 17, to: 21, text: 'Good evening 🌇' },
    { from: 0,  to: 24, text: 'Good night 🌙' },
  ];

  function getGreeting(hour) {
    return (greetings.find(g => hour >= g.from && hour < g.to) || greetings[3]).text;
  }

  function tick() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const s   = String(now.getSeconds()).padStart(2, '0');

    timeEl.textContent     = `${h}:${m}:${s}`;
    greetingEl.textContent = getGreeting(now.getHours());
    dateEl.textContent     = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  tick();
  setInterval(tick, 1000);
})();


// ─── FOCUS TIMER ─────────────────────────────────────────────────────────────

(function initTimer() {
  const DURATION    = 25 * 60; // seconds
  const CIRCUMF     = 2 * Math.PI * 54; // ring circumference (r=54)

  const displayEl   = document.getElementById('timer-display');
  const statusEl    = document.getElementById('timer-status');
  const labelEl     = document.getElementById('timer-label');
  const ringEl      = document.getElementById('ring-progress');
  const btnStart    = document.getElementById('timer-start');
  const btnStartTxt = document.getElementById('timer-start-text');
  const btnStop     = document.getElementById('timer-stop');
  const btnReset    = document.getElementById('timer-reset');
  const heroCta     = document.getElementById('hero-cta');

  let seconds  = DURATION;
  let interval = null;
  let running  = false;

  function fmt(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateRing() {
    const progress = seconds / DURATION;
    ringEl.style.strokeDashoffset = CIRCUMF * (1 - progress);
  }

  function render() {
    displayEl.textContent = fmt(seconds);
    updateRing();
  }

  function setRunningUI(isRunning) {
    if (isRunning) {
      displayEl.classList.add('running');
      displayEl.classList.remove('finished');
      ringEl.classList.add('running');
      ringEl.classList.remove('finished');
      btnStart.classList.add('running');
      btnStartTxt.textContent = 'Session Running';
      statusEl.textContent    = 'Focusing';
      labelEl.textContent     = `${Math.ceil(seconds / 60)} minutes remaining`;
    } else {
      displayEl.classList.remove('running');
      ringEl.classList.remove('running');
      btnStart.classList.remove('running');
      btnStartTxt.textContent = 'Start';
    }
  }

  function start() {
    if (running) return;
    running = true;
    setRunningUI(true);

    // Dismiss onboarding on first interaction
    const banner = document.getElementById('onboarding');
    if (!banner.classList.contains('hidden')) {
      banner.classList.add('hidden');
      storageSet('dashboard_onboarding_done', true);
    }

    interval = setInterval(() => {
      seconds--;
      render();
      // Update label every minute
      if (seconds % 60 === 0 && seconds > 0) {
        labelEl.textContent = `${Math.ceil(seconds / 60)} minutes remaining`;
      }

      if (seconds <= 0) {
        clearInterval(interval);
        running = false;
        displayEl.classList.remove('running');
        displayEl.classList.add('finished');
        ringEl.classList.remove('running');
        ringEl.classList.add('finished');
        btnStart.classList.remove('running');
        btnStartTxt.textContent = 'Start';
        statusEl.textContent    = 'Done!';
        labelEl.textContent     = '🎉 Session complete! Take a well-earned break.';
        showToast('Focus session complete! 🎉');
      }
    }, 1000);
  }

  function stop() {
    if (!running) return;
    clearInterval(interval);
    running = false;
    setRunningUI(false);
    statusEl.textContent = 'Paused';
    labelEl.textContent  = 'Session paused. Resume when ready.';
  }

  function reset() {
    clearInterval(interval);
    running  = false;
    seconds  = DURATION;
    displayEl.classList.remove('running', 'finished');
    ringEl.classList.remove('running', 'finished');
    btnStart.classList.remove('running');
    btnStartTxt.textContent = 'Start';
    statusEl.textContent    = 'Ready';
    labelEl.textContent     = 'Ready to focus?';
    render();
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', reset);

  // Hero CTA scrolls to timer and starts it
  heroCta.addEventListener('click', () => {
    document.getElementById('timer-section').scrollIntoView({ behavior: 'smooth' });
    setTimeout(start, 400);
  });

  render();
})();


// ─── TO-DO LIST ──────────────────────────────────────────────────────────────

(function initTodos() {
  const inputEl    = document.getElementById('todo-input');
  const addBtn     = document.getElementById('todo-add');
  const listEl     = document.getElementById('todo-list');
  const emptyEl    = document.getElementById('todo-empty');

  const overlayEl  = document.getElementById('modal-overlay');
  const modalInput = document.getElementById('modal-input');
  const saveBtn    = document.getElementById('modal-save');
  const cancelBtn  = document.getElementById('modal-cancel');

  let todos         = storageGet('dashboard_todos', []);
  let editingId     = null;

  function save() { storageSet('dashboard_todos', todos); }

  function render() {
    listEl.innerHTML = '';

    if (todos.length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';

    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className  = `todo-item${todo.done ? ' done' : ''}`;
      li.dataset.id = todo.id;

      // Checkbox
      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.className = 'todo-checkbox';
      cb.checked   = todo.done;
      cb.setAttribute('aria-label', 'Mark task complete');
      cb.addEventListener('change', () => toggle(todo.id));

      // Text
      const span = document.createElement('span');
      span.className   = 'todo-text';
      span.textContent = todo.text;

      // Actions
      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.type      = 'button';
      editBtn.className = 'btn-icon';
      editBtn.innerHTML = '✏️';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => openModal(todo.id));

      const delBtn = document.createElement('button');
      delBtn.type      = 'button';
      delBtn.className = 'btn-icon danger';
      delBtn.innerHTML = '🗑️';
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.addEventListener('click', () => remove(todo.id));

      actions.append(editBtn, delBtn);
      li.append(cb, span, actions);
      listEl.appendChild(li);
    });
  }

  function add() {
    const text = inputEl.value.trim();
    if (!text) return;
    todos.push({ id: generateId(), text, done: false });
    save();
    render();
    inputEl.value = '';
    inputEl.focus();
    showToast('Task added ✓');

    // Dismiss onboarding
    const banner = document.getElementById('onboarding');
    if (!banner.classList.contains('hidden')) {
      banner.classList.add('hidden');
      storageSet('dashboard_onboarding_done', true);
    }
  }

  function toggle(id) {
    const t = todos.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); render(); }
  }

  function remove(id) {
    todos = todos.filter(x => x.id !== id);
    save();
    render();
  }

  function openModal(id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    editingId          = id;
    modalInput.value   = t.text;
    overlayEl.classList.add('open');
    modalInput.focus();
  }

  function closeModal() {
    overlayEl.classList.remove('open');
    editingId        = null;
    modalInput.value = '';
  }

  function saveEdit() {
    const text = modalInput.value.trim();
    if (!text) return;
    const t = todos.find(x => x.id === editingId);
    if (t) { t.text = text; save(); render(); }
    closeModal();
    showToast('Task updated ✓');
  }

  addBtn.addEventListener('click', add);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  saveBtn.addEventListener('click', saveEdit);
  cancelBtn.addEventListener('click', closeModal);
  modalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') closeModal();
  });
  overlayEl.addEventListener('click', e => {
    if (e.target === overlayEl) closeModal();
  });

  render();
})();


// ─── QUICK LINKS ─────────────────────────────────────────────────────────────

(function initLinks() {
  const nameInput = document.getElementById('link-name-input');
  const urlInput  = document.getElementById('link-url-input');
  const addBtn    = document.getElementById('link-add');
  const gridEl    = document.getElementById('links-grid');
  const emptyEl   = document.getElementById('links-empty');

  let links = storageGet('dashboard_links', []);

  function save() { storageSet('dashboard_links', links); }

  function render() {
    gridEl.innerHTML = '';

    if (links.length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';

    links.forEach(link => {
      const chip = document.createElement('a');
      chip.className = 'link-chip';
      chip.href      = link.url;
      chip.target    = '_blank';
      chip.rel       = 'noopener noreferrer';

      const label = document.createElement('span');
      label.textContent = link.name;

      const removeBtn = document.createElement('button');
      removeBtn.type      = 'button';
      removeBtn.className = 'link-remove';
      removeBtn.innerHTML = '×';
      removeBtn.setAttribute('aria-label', `Remove ${link.name}`);
      removeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        remove(link.id);
      });

      chip.append(label, removeBtn);
      gridEl.appendChild(chip);
    });
  }

  function add() {
    const name = nameInput.value.trim();
    let   url  = urlInput.value.trim();
    if (!name || !url) return;

    // Auto-prepend protocol if missing
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    links.push({ id: generateId(), name, url });
    save();
    render();
    nameInput.value = '';
    urlInput.value  = '';
    nameInput.focus();
    showToast('Link saved ✓');
  }

  function remove(id) {
    links = links.filter(l => l.id !== id);
    save();
    render();
  }

  addBtn.addEventListener('click', add);
  urlInput.addEventListener('keydown',  e => { if (e.key === 'Enter') add(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });

  render();
})();
