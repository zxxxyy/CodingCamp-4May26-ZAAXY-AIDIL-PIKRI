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

// ─── AUDIO & NOTIFICATION ────────────────────────────────────────────────────

const AudioNotif = (function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // Play a pleasant 3-tone chime
  function playChime() {
    try {
      const ac   = getCtx();
      const now  = ac.currentTime;
      const tones = [523.25, 659.25, 783.99]; // C5, E5, G5

      tones.forEach((freq, i) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        osc.type      = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.18);

        gain.gain.setValueAtTime(0, now + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.6);

        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.65);
      });
    } catch (e) {
      // Audio not available — fail silently
    }
  }

  // Browser push notification
  function sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(title, { body });
      });
    }
  }

  return { playChime, sendNotification };
})();


function showToast(message, undoCallback = null) {
  const toast = document.getElementById('toast');
  toast.innerHTML = '';

  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.className   = 'toast-undo';
    undoBtn.addEventListener('click', () => {
      undoCallback();
      toast.classList.remove('show');
    });
    toast.appendChild(undoBtn);
  }

  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
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


// ─── MOTIVASI SLIDER ─────────────────────────────────────────────────────────

(function initMotivasiSlider() {
  const texts = document.querySelectorAll('.motivasi-text');
  if (texts.length === 0) return;

  let current = 0;

  // Make sure only first is visible on start
  texts.forEach((t, i) => {
    t.className = 'motivasi-text' + (i === 0 ? ' active' : '');
  });

  setInterval(() => {
    const prev = current;
    current = (current + 1) % texts.length;

    // Slide out current to left
    texts[prev].classList.add('exit');

    // Slide in next from right after a brief overlap
    setTimeout(() => {
      texts[prev].classList.remove('active', 'exit');
      texts[current].classList.add('active');
    }, 400);

  }, 4000);
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

    // Request notification permission on first start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

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
        AudioNotif.playChime();
        AudioNotif.sendNotification(
          'Session Complete! 🎉',
          'Great work! Time to take a well-earned break.'
        );
        // Only count focus sessions
        if (currentMode === 'focus') incrementSession();
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

  // ── Session Counter ──────────────────────────────────────────────────────
  const sessionDotsEl  = document.getElementById('session-dots');
  const sessionResetEl = document.getElementById('session-reset');
  const TODAY          = new Date().toDateString();

  // Reset count if it's a new day
  const saved = storageGet('dashboard_sessions', { date: TODAY, count: 0 });
  let sessionCount = saved.date === TODAY ? saved.count : 0;

  function saveSession() {
    storageSet('dashboard_sessions', { date: TODAY, count: sessionCount });
  }

  function renderSessionDots() {
    sessionDotsEl.innerHTML = '';
    const total = Math.max(sessionCount, 8); // show at least 8 slots
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'session-dot' + (i < sessionCount ? ' filled' : '');
      dot.setAttribute('aria-hidden', 'true');
      sessionDotsEl.appendChild(dot);
    }
  }

  function incrementSession() {
    sessionCount++;
    saveSession();
    renderSessionDots();
    // Every 4 sessions = 1 full set
    if (sessionCount % 4 === 0) {
      showToast(`🏆 ${sessionCount / 4} full set${sessionCount / 4 > 1 ? 's' : ''} complete! Take a long break.`);
    }
  }

  sessionResetEl.addEventListener('click', () => {
    sessionCount = 0;
    saveSession();
    renderSessionDots();
    showToast('Session count reset');
  });

  renderSessionDots();
  // ─────────────────────────────────────────────────────────────────────────

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
  const inputEl        = document.getElementById('todo-input');
  const prioritySelect = document.getElementById('todo-priority');
  const addBtn         = document.getElementById('todo-add');
  const listEl         = document.getElementById('todo-list');
  const emptyEl        = document.getElementById('todo-empty');
  const overlayEl      = document.getElementById('modal-overlay');
  const modalInput     = document.getElementById('modal-input');
  const modalPriority  = document.getElementById('modal-priority');
  const modalDeadline  = document.getElementById('modal-deadline');
  const saveBtn        = document.getElementById('modal-save');
  const cancelBtn      = document.getElementById('modal-cancel');

  let todos     = storageGet('dashboard_todos', []);
  let editingId = null;

  const PRIORITY_ORDER = { high: 0, medium: 1, normal: 2, low: 3 };
  const PRIORITY_ICON  = { high: '🔴', medium: '🟡', low: '🟢', normal: '' };

  function save() { storageSet('dashboard_todos', todos); }

  function isOverdue(deadline) {
    if (!deadline) return false;
    return new Date(deadline) < new Date(new Date().toDateString());
  }

  function isDueToday(deadline) {
    if (!deadline) return false;
    return new Date(deadline).toDateString() === new Date().toDateString();
  }

  function formatDeadline(deadline) {
    if (!deadline) return '';
    const d = new Date(deadline);
    if (isDueToday(deadline)) return 'Today';
    if (isOverdue(deadline))  return `Overdue · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function sortedTodos() {
    return [...todos].sort((a, b) => {
      // Done tasks go to bottom
      if (a.done !== b.done) return a.done ? 1 : -1;
      // Sort by priority
      const pa = PRIORITY_ORDER[a.priority || 'normal'];
      const pb = PRIORITY_ORDER[b.priority || 'normal'];
      if (pa !== pb) return pa - pb;
      // Sort by deadline (earliest first, no deadline last)
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }

  function render() {
    listEl.innerHTML = '';
    if (todos.length === 0) { emptyEl.style.display = 'flex'; return; }
    emptyEl.style.display = 'none';

    sortedTodos().forEach(todo => {
      const priority = todo.priority || 'normal';
      const overdue  = !todo.done && isOverdue(todo.deadline);
      const dueToday = !todo.done && isDueToday(todo.deadline);

      const li = document.createElement('li');
      li.className  = [
        'todo-item',
        todo.done   ? 'done'    : '',
        overdue     ? 'overdue' : '',
        dueToday    ? 'due-today' : '',
        priority !== 'normal' ? `priority-${priority}` : '',
      ].filter(Boolean).join(' ');
      li.dataset.id = todo.id;

      // Priority indicator bar
      if (priority !== 'normal') {
        const bar = document.createElement('span');
        bar.className = `priority-bar priority-bar--${priority}`;
        bar.setAttribute('aria-hidden', 'true');
        li.appendChild(bar);
      }

      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.className = 'todo-checkbox';
      cb.checked   = todo.done;
      cb.setAttribute('aria-label', 'Mark task complete');
      cb.addEventListener('change', () => toggle(todo.id));

      // Text + deadline badge
      const textWrap = document.createElement('div');
      textWrap.className = 'todo-text-wrap';

      const span = document.createElement('span');
      span.className   = 'todo-text';
      span.textContent = todo.text;
      textWrap.appendChild(span);

      if (todo.deadline) {
        const badge = document.createElement('span');
        badge.className   = `todo-deadline${overdue ? ' overdue' : dueToday ? ' today' : ''}`;
        badge.textContent = formatDeadline(todo.deadline);
        textWrap.appendChild(badge);
      }

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.type      = 'button';
      editBtn.className = 'btn-icon';
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => openModal(todo.id));

      const delBtn = document.createElement('button');
      delBtn.type      = 'button';
      delBtn.className = 'btn-icon danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.addEventListener('click', () => remove(todo.id));

      actions.append(editBtn, delBtn);
      li.append(cb, textWrap, actions);
      listEl.appendChild(li);
    });
  }

  function add() {
    const text     = inputEl.value.trim();
    const priority = prioritySelect.value;
    if (!text) return;

    todos.push({ id: generateId(), text, done: false, priority, deadline: '' });
    save();
    render();
    inputEl.value        = '';
    prioritySelect.value = 'normal';
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
    const deleted = todos.find(x => x.id === id);
    const index   = todos.findIndex(x => x.id === id);
    todos = todos.filter(x => x.id !== id);
    save();
    render();
    showToast('Task deleted', () => {
      todos.splice(index, 0, deleted);
      save();
      render();
    });
  }

  function openModal(id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    editingId              = id;
    modalInput.value       = t.text;
    modalPriority.value    = t.priority  || 'normal';
    modalDeadline.value    = t.deadline  || '';
    overlayEl.classList.add('open');
    modalInput.focus();
  }

  function closeModal() {
    overlayEl.classList.remove('open');
    editingId           = null;
    modalInput.value    = '';
    modalPriority.value = 'normal';
    modalDeadline.value = '';
  }

  function saveEdit() {
    const text = modalInput.value.trim();
    if (!text) return;
    const t = todos.find(x => x.id === editingId);
    if (t) {
      t.text     = text;
      t.priority = modalPriority.value;
      t.deadline = modalDeadline.value;
      save();
      render();
    }
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

      // Favicon via Google's favicon service
      const favicon = document.createElement('img');
      favicon.className = 'link-favicon';
      favicon.alt       = '';
      favicon.width     = 14;
      favicon.height    = 14;
      try {
        const domain = new URL(link.url).hostname;
        favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      } catch {
        favicon.style.display = 'none';
      }
      // Hide broken favicon gracefully
      favicon.addEventListener('error', () => { favicon.style.display = 'none'; });

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

      chip.append(favicon, label, removeBtn);
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


// ─── WELCOME TOUR ─────────────────────────────────────────────────────────────

(function initTour() {
  // Only show on first visit (no onboarding_done yet)
  if (storageGet('dashboard_tour_done', false)) return;

  const overlay  = document.getElementById('tour-overlay');
  const steps    = document.querySelectorAll('.tour-step');
  const dots     = document.querySelectorAll('.tour-dot');
  const nextBtn  = document.getElementById('tour-next');
  const skipBtn  = document.getElementById('tour-skip');

  let current = 0;
  const total = steps.length;

  overlay.classList.add('open');
  nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';

  function goTo(index) {
    // Animate out current
    steps[current].classList.add('slide-out-left');
    setTimeout(() => {
      steps[current].classList.remove('active', 'slide-out-left');
      dots[current].classList.remove('active');

      current = index;

      steps[current].classList.add('active', 'slide-in-right');
      dots[current].classList.add('active');

      setTimeout(() => steps[current].classList.remove('slide-in-right'), 260);

      nextBtn.textContent = current === total - 1 ? '' : 'Next →';
      if (current === total - 1) {
        nextBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Get Started';
      } else {
        nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
      }
    }, 220);
  }

  function close() {
    overlay.classList.remove('open');
    storageSet('dashboard_tour_done', true);
    // Also mark onboarding done so banner doesn't show
    storageSet('dashboard_onboarding_done', true);
    document.getElementById('onboarding').classList.add('hidden');
  }

  nextBtn.addEventListener('click', () => {
    if (current < total - 1) {
      goTo(current + 1);
    } else {
      close();
    }
  });

  skipBtn.addEventListener('click', close);

  // Click dots to jump to step
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (i !== current) goTo(i);
    });
  });

  // Close on backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function onTourKey(e) {
    if (!overlay.classList.contains('open')) {
      document.removeEventListener('keydown', onTourKey);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (current < total - 1) goTo(current + 1); else close();
    }
    if (e.key === 'ArrowLeft' && current > 0) goTo(current - 1);
    if (e.key === 'Escape') close();
  });
})();
