/* =============================================
   LIFE DASHBOARD — app.js
   Vanilla JS | Local Storage | No frameworks
   Features: Light/Dark, Custom Name, Pomodoro, Quick Note
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
  } catch {}
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}


// ─── THEME (LIGHT / DARK) ────────────────────────────────────────────────────

(function initTheme() {
  const toggle = document.getElementById('toggle-theme');
  const isLight = storageGet('dashboard_light_mode', false);

  function applyTheme(light) {
    if (light) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    toggle.checked = light;
  }

  applyTheme(isLight);

  toggle.addEventListener('change', () => {
    const light = toggle.checked;
    applyTheme(light);
    storageSet('dashboard_light_mode', light);
  });
})();


// ─── ONBOARDING ──────────────────────────────────────────────────────────────

(function initOnboarding() {
  const banner  = document.getElementById('onboarding');
  const closeBtn = document.getElementById('onboarding-close');

  if (storageGet('dashboard_onboarding_done', false)) {
    banner.classList.add('hidden');
    return;
  }

  closeBtn.addEventListener('click', () => {
    banner.classList.add('hidden');
    storageSet('dashboard_onboarding_done', true);
  });
})();


// ─── CLOCK & GREETING (with custom name) ─────────────────────────────────────

(function initClock() {
  const timeEl     = document.getElementById('current-time');
  const dateEl     = document.getElementById('current-date');
  const greetingEl = document.getElementById('greeting-text');

  const greetings = [
    { from: 5,  to: 12, text: 'Good morning' },
    { from: 12, to: 17, text: 'Good afternoon' },
    { from: 17, to: 21, text: 'Good evening' },
    { from: 0,  to: 24, text: 'Good night' },
  ];

  const emojis = [
    { from: 5,  to: 12, emoji: '☀️' },
    { from: 12, to: 17, emoji: '🌤️' },
    { from: 17, to: 21, emoji: '🌇' },
    { from: 0,  to: 24, emoji: '🌙' },
  ];

  function getGreeting(hour) {
    const g = greetings.find(g => hour >= g.from && hour < g.to) || greetings[3];
    const e = emojis.find(e => hour >= e.from && hour < e.to) || emojis[3];
    const name = storageGet('dashboard_user_name', '');
    return name
      ? `${g.text}, ${name} ${e.emoji}`
      : `${g.text} ${e.emoji}`;
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

  // Expose refresh so settings can trigger greeting update
  window._refreshGreeting = tick;
})();


// ─── SETTINGS PANEL ──────────────────────────────────────────────────────────

(function initSettings() {
  const btn     = document.getElementById('settings-btn');
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close');

  function open() { overlay.classList.add('open'); }
  function close() { overlay.classList.remove('open'); }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();


// ─── CUSTOM NAME ─────────────────────────────────────────────────────────────

(function initCustomName() {
  const nameInput = document.getElementById('settings-name');
  const saveBtn   = document.getElementById('settings-name-save');

  // Load saved name
  const saved = storageGet('dashboard_user_name', '');
  if (saved) nameInput.value = saved;

  function saveName() {
    const name = nameInput.value.trim();
    storageSet('dashboard_user_name', name);
    if (window._refreshGreeting) window._refreshGreeting();
    showToast(name ? `Hi ${name}! 👋` : 'Name cleared');
  }

  saveBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
})();


// ─── FOCUS TIMER (with custom Pomodoro times & modes) ────────────────────────

(function initTimer() {
  const CIRCUMF = 2 * Math.PI * 54;

  const displayEl   = document.getElementById('timer-display');
  const statusEl    = document.getElementById('timer-status');
  const labelEl     = document.getElementById('timer-label');
  const ringEl      = document.getElementById('ring-progress');
  const btnStart    = document.getElementById('timer-start');
  const btnStartTxt = document.getElementById('timer-start-text');
  const btnStop     = document.getElementById('timer-stop');
  const btnReset    = document.getElementById('timer-reset');
  const heroCta     = document.getElementById('hero-cta');

  // Pomodoro settings inputs
  const pomoFocusEl = document.getElementById('pomo-focus');
  const pomoShortEl = document.getElementById('pomo-short');
  const pomoLongEl  = document.getElementById('pomo-long');
  const applyBtn    = document.getElementById('pomo-apply');
  const resetDefBtn = document.getElementById('pomo-reset-default');
  const modeBtns    = document.querySelectorAll('.pomo-mode-btn');

  // Load saved pomo times
  let pomoTimes = storageGet('dashboard_pomo_times', { focus: 25, short: 5, long: 15 });
  let currentMode = 'focus';

  // Sync inputs with saved values
  pomoFocusEl.value = pomoTimes.focus;
  pomoShortEl.value = pomoTimes.short;
  pomoLongEl.value  = pomoTimes.long;

  function getDuration(mode) {
    return pomoTimes[mode] * 60;
  }

  let seconds  = getDuration('focus');
  let interval = null;
  let running  = false;

  function fmt(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateRing() {
    const progress = seconds / getDuration(currentMode);
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
      btnStartTxt.textContent = 'Running…';
      statusEl.textContent    = currentMode === 'focus' ? 'Focusing' : 'On Break';
      labelEl.textContent     = `${Math.ceil(seconds / 60)} min remaining`;
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

    const banner = document.getElementById('onboarding');
    if (!banner.classList.contains('hidden')) {
      banner.classList.add('hidden');
      storageSet('dashboard_onboarding_done', true);
    }

    interval = setInterval(() => {
      seconds--;
      render();
      if (seconds % 60 === 0 && seconds > 0) {
        labelEl.textContent = `${Math.ceil(seconds / 60)} min remaining`;
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

  function resetTimer() {
    clearInterval(interval);
    running  = false;
    seconds  = getDuration(currentMode);
    displayEl.classList.remove('running', 'finished');
    ringEl.classList.remove('running', 'finished');
    btnStart.classList.remove('running');
    btnStartTxt.textContent = 'Start';
    statusEl.textContent    = 'Ready';
    labelEl.textContent     = 'Ready to focus?';
    render();
  }

  function switchMode(mode) {
    if (running) {
      stop();
    }
    currentMode = mode;
    seconds = getDuration(mode);
    displayEl.classList.remove('running', 'finished');
    ringEl.classList.remove('running', 'finished');
    btnStart.classList.remove('running');
    btnStartTxt.textContent = 'Start';
    statusEl.textContent = 'Ready';

    const labels = { focus: 'Ready to focus?', short: 'Short break — relax!', long: 'Long break — recharge!' };
    labelEl.textContent = labels[mode];
    render();

    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }

  // Apply new pomo times
  applyBtn.addEventListener('click', () => {
    const f = Math.max(1, Math.min(90, parseInt(pomoFocusEl.value) || 25));
    const s = Math.max(1, Math.min(30, parseInt(pomoShortEl.value) || 5));
    const l = Math.max(1, Math.min(60, parseInt(pomoLongEl.value) || 15));

    pomoFocusEl.value = f;
    pomoShortEl.value = s;
    pomoLongEl.value  = l;

    pomoTimes = { focus: f, short: s, long: l };
    storageSet('dashboard_pomo_times', pomoTimes);

    // Reset timer to new duration
    stop();
    seconds = getDuration(currentMode);
    render();
    showToast('Timer updated ✓');
  });

  resetDefBtn.addEventListener('click', () => {
    pomoTimes = { focus: 25, short: 5, long: 15 };
    pomoFocusEl.value = 25;
    pomoShortEl.value = 5;
    pomoLongEl.value  = 15;
    storageSet('dashboard_pomo_times', pomoTimes);
    stop();
    seconds = getDuration(currentMode);
    render();
    showToast('Timer reset to default');
  });

  modeBtns.forEach(b => {
    b.addEventListener('click', () => switchMode(b.dataset.mode));
  });

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', resetTimer);

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

  let todos     = storageGet('dashboard_todos', []);
  let editingId = null;

  function save() { storageSet('dashboard_todos', todos); }

  function render() {
    listEl.innerHTML = '';
    if (todos.length === 0) { emptyEl.style.display = 'flex'; return; }
    emptyEl.style.display = 'none';

    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className  = `todo-item${todo.done ? ' done' : ''}`;
      li.dataset.id = todo.id;

      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.className = 'todo-checkbox';
      cb.checked   = todo.done;
      cb.setAttribute('aria-label', 'Mark task complete');
      cb.addEventListener('change', () => toggle(todo.id));

      const span = document.createElement('span');
      span.className   = 'todo-text';
      span.textContent = todo.text;

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
    editingId        = id;
    modalInput.value = t.text;
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
  overlayEl.addEventListener('click', e => { if (e.target === overlayEl) closeModal(); });

  render();
})();


// ─── QUICK NOTE ──────────────────────────────────────────────────────────────

(function initNote() {
  const textarea   = document.getElementById('note-textarea');
  const charCount  = document.getElementById('note-char-count');
  const savedLabel = document.getElementById('note-saved');

  let saveTimer;

  // Load saved note
  const saved = storageGet('dashboard_quick_note', '');
  textarea.value = saved;
  charCount.textContent = `${saved.length} / 500`;

  function triggerSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      storageSet('dashboard_quick_note', textarea.value);
      savedLabel.classList.add('show');
      setTimeout(() => savedLabel.classList.remove('show'), 1500);
    }, 600);
  }

  textarea.addEventListener('input', () => {
    charCount.textContent = `${textarea.value.length} / 500`;
    triggerSave();
  });
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
    if (links.length === 0) { emptyEl.style.display = 'flex'; return; }
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


// ─── INFO TOOLTIP TOGGLE (mobile tap support) ────────────────────────────────

(function initTooltips() {
  const infoBtns = document.querySelectorAll('.info-btn');

  function positionTooltip(btn) {
    const tooltip = btn.querySelector('.info-tooltip');
    if (!tooltip) return;

    // Reset positioning so we can measure correctly
    tooltip.style.left   = '';
    tooltip.style.top    = '';
    tooltip.style.right  = '';
    tooltip.style.bottom = '';

    const btnRect     = btn.getBoundingClientRect();
    const tipWidth    = tooltip.offsetWidth  || 220;
    const tipHeight   = tooltip.offsetHeight || 80;
    const margin      = 8;
    const screenW     = window.innerWidth;
    const screenH     = window.innerHeight;

    // Vertical: prefer below, flip above if not enough room
    let top = btnRect.bottom + margin;
    if (top + tipHeight > screenH - margin) {
      top = btnRect.top - tipHeight - margin;
    }

    // Horizontal: center on button, clamp to viewport
    let left = btnRect.left + btnRect.width / 2 - tipWidth / 2;
    left = Math.max(margin, Math.min(left, screenW - tipWidth - margin));

    tooltip.style.top  = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  infoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = btn.classList.contains('active');
      // Close all others
      infoBtns.forEach(b => b.classList.remove('active'));
      if (!isActive) {
        btn.classList.add('active');
        positionTooltip(btn);
      }
    });
  });

  // Close on outside click or scroll
  document.addEventListener('click', () => {
    infoBtns.forEach(b => b.classList.remove('active'));
  });

  window.addEventListener('scroll', () => {
    infoBtns.forEach(b => b.classList.remove('active'));
  }, { passive: true });
})();