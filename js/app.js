/* =============================================
   LIFE DASHBOARD — app.js
   Vanilla JS | Local Storage | No frameworks
   ============================================= */

// ─── GREETING & CLOCK ────────────────────────────────────────────────────────

const greetingEl = document.getElementById('greeting-text');
const timeEl     = document.getElementById('current-time');
const dateEl     = document.getElementById('current-date');

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good morning ☀️';
  if (hour >= 12 && hour < 17) return 'Good afternoon 🌤️';
  if (hour >= 17 && hour < 21) return 'Good evening 🌇';
  return 'Good night 🌙';
}

function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');

  timeEl.textContent    = `${h}:${m}:${s}`;
  greetingEl.textContent = getGreeting(now.getHours());

  dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

updateClock();
setInterval(updateClock, 1000);


// ─── FOCUS TIMER ─────────────────────────────────────────────────────────────

const TIMER_DURATION = 25 * 60; // seconds

const timerDisplay = document.getElementById('timer-display');
const timerLabel   = document.getElementById('timer-label');
const btnStart     = document.getElementById('timer-start');
const btnStop      = document.getElementById('timer-stop');
const btnReset     = document.getElementById('timer-reset');

let timerSeconds   = TIMER_DURATION;
let timerInterval  = null;
let timerRunning   = false;

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerDisplay.classList.add('running');
  timerDisplay.classList.remove('finished');
  timerLabel.textContent = 'Stay focused!';

  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer();

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplay.classList.remove('running');
      timerDisplay.classList.add('finished');
      timerLabel.textContent = '🎉 Session complete! Take a break.';
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerDisplay.classList.remove('running');
  timerLabel.textContent = 'Paused.';
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning  = false;
  timerSeconds  = TIMER_DURATION;
  timerDisplay.classList.remove('running', 'finished');
  timerLabel.textContent = 'Ready to focus?';
  renderTimer();
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click', stopTimer);
btnReset.addEventListener('click', resetTimer);

renderTimer();


// ─── TO-DO LIST ──────────────────────────────────────────────────────────────

const todoInput  = document.getElementById('todo-input');
const todoAddBtn = document.getElementById('todo-add');
const todoListEl = document.getElementById('todo-list');
const todoEmpty  = document.getElementById('todo-empty');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const modalInput   = document.getElementById('modal-input');
const modalSave    = document.getElementById('modal-save');
const modalCancel  = document.getElementById('modal-cancel');

let todos         = loadTodos();
let editingTodoId = null;

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem('dashboard_todos')) || [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem('dashboard_todos', JSON.stringify(todos));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function renderTodos() {
  todoListEl.innerHTML = '';

  if (todos.length === 0) {
    todoEmpty.style.display = 'block';
    return;
  }

  todoEmpty.style.display = 'none';

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked   = todo.done;
    checkbox.setAttribute('aria-label', 'Mark task complete');
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // Text
    const span = document.createElement('span');
    span.className   = 'todo-text';
    span.textContent = todo.text;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.innerHTML = '✏️';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.addEventListener('click', () => openEditModal(todo.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon danger';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);
    todoListEl.appendChild(li);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  todos.push({ id: generateId(), text, done: false });
  saveTodos();
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    saveTodos();
    renderTodos();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

function openEditModal(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  editingTodoId      = id;
  modalInput.value   = todo.text;
  modalOverlay.classList.add('open');
  modalInput.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingTodoId = null;
  modalInput.value = '';
}

function saveEdit() {
  const text = modalInput.value.trim();
  if (!text) return;

  const todo = todos.find(t => t.id === editingTodoId);
  if (todo) {
    todo.text = text;
    saveTodos();
    renderTodos();
  }
  closeModal();
}

todoAddBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
modalSave.addEventListener('click', saveEdit);
modalCancel.addEventListener('click', closeModal);
modalInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeModal();
});
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

renderTodos();


// ─── QUICK LINKS ─────────────────────────────────────────────────────────────

const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput  = document.getElementById('link-url-input');
const linkAddBtn    = document.getElementById('link-add');
const linksGrid     = document.getElementById('links-grid');
const linksEmpty    = document.getElementById('links-empty');

let links = loadLinks();

function loadLinks() {
  try {
    return JSON.parse(localStorage.getItem('dashboard_links')) || [];
  } catch {
    return [];
  }
}

function saveLinks() {
  localStorage.setItem('dashboard_links', JSON.stringify(links));
}

function renderLinks() {
  linksGrid.innerHTML = '';

  if (links.length === 0) {
    linksEmpty.style.display = 'block';
    return;
  }

  linksEmpty.style.display = 'none';

  links.forEach(link => {
    const chip = document.createElement('a');
    chip.className  = 'link-chip';
    chip.href       = link.url;
    chip.target     = '_blank';
    chip.rel        = 'noopener noreferrer';

    const label = document.createElement('span');
    label.textContent = link.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'link-remove';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', `Remove ${link.name}`);
    removeBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      removeLink(link.id);
    });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  let   url  = linkUrlInput.value.trim();

  if (!name || !url) return;

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  links.push({ id: generateId(), name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

function removeLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

linkAddBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
linkNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

renderLinks();
