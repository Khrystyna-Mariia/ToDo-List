const API_URL = '/api/tasks';

const STATUS_ORDER = ['todo', 'in_progress', 'paused', 'done'];
const STATUS_META = {
  todo: { label: 'Не розпочато' },
  in_progress: { label: 'В процесі' },
  paused: { label: 'На паузі' },
  done: { label: 'Виконано' },
};

const PRIORITY_ORDER = ['high', 'medium', 'low'];
const PRIORITY_META = {
  high: { label: '🔴' },
  medium: { label: '🟡' },
  low: { label: '🟢' },
};

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const board = document.getElementById('board');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const taskCount = document.getElementById('task-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const confettiLayer = document.getElementById('confetti-layer');
const bgLayers = document.querySelectorAll('.bg-layer');

let tasks = [];

// --- Робота з API ---

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Помилка запиту: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadTasks() {
  try {
    tasks = await apiRequest(API_URL);
    hideError();
    render();
  } catch (err) {
    showError('Не вдалося завантажити завдання. Перевірте, чи запущено сервер.');
  }
}

async function addTask(text, priority) {
  try {
    const newTask = await apiRequest(API_URL, {
      method: 'POST',
      body: JSON.stringify({ text, priority }),
    });
    tasks.push(newTask);
    hideError();
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function updateTask(id, updates) {
  try {
    const updated = await apiRequest(`${API_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) tasks[idx] = updated;
    hideError();
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteTask(id) {
  try {
    await apiRequest(`${API_URL}/${id}`, { method: 'DELETE' });
    tasks = tasks.filter((t) => t.id !== id);
    hideError();
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function clearCompletedTasks() {
  try {
    await apiRequest(`${API_URL}/completed`, { method: 'DELETE' });
    tasks = tasks.filter((t) => !t.completed);
    hideError();
    render();
  } catch (err) {
    showError(err.message);
  }
}

function taskStatus(task) {
  return task.status || (task.completed ? 'done' : 'todo');
}

function taskPriority(task) {
  return task.priority || 'medium';
}

function render() {
  board.innerHTML = '';

  STATUS_ORDER.forEach((status) => {
    const columnTasks = tasks
      .filter((t) => taskStatus(t) === status)
      .sort((a, b) => PRIORITY_ORDER.indexOf(taskPriority(a)) - PRIORITY_ORDER.indexOf(taskPriority(b)));

    const column = document.createElement('div');
    column.className = 'column';
    column.dataset.status = status;

    const header = document.createElement('div');
    header.className = 'column-header';

    const title = document.createElement('span');
    title.className = 'column-title';
    title.textContent = STATUS_META[status].label;

    const count = document.createElement('span');
    count.className = 'column-count';
    count.textContent = columnTasks.length;

    header.append(title, count);

    const body = document.createElement('div');
    body.className = 'column-body';

    if (columnTasks.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'column-empty';
      emptyHint.textContent = 'Порожньо';
      body.appendChild(emptyHint);
    } else {
      columnTasks.forEach((task) => body.appendChild(buildTaskCard(task, status)));
    }

    column.append(header, body);
    board.appendChild(column);
  });

  emptyState.hidden = tasks.length !== 0;

  const activeCount = tasks.filter((t) => !t.completed).length;
  taskCount.textContent = `Активних: ${activeCount} з ${tasks.length}`;

  updateProgress();
  updateBackgroundTheme();
}

function updateBackgroundTheme() {
  const counts = { todo: 0, in_progress: 0, paused: 0, done: 0 };
  tasks.forEach((t) => {
    counts[taskStatus(t)] += 1;
  });

  let dominant = 'default';
  let maxCount = 0;
  let tie = false;

  STATUS_ORDER.forEach((status) => {
    if (counts[status] > maxCount) {
      maxCount = counts[status];
      dominant = status;
      tie = false;
    } else if (counts[status] === maxCount && maxCount > 0) {
      tie = true;
    }
  });

  if (maxCount === 0 || tie) {
    dominant = 'default';
  }

  bgLayers.forEach((layer) => {
    layer.classList.toggle('active', layer.dataset.theme === dominant);
  });
}

function buildTaskCard(task, status) {
  const priority = taskPriority(task);

  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id;
  card.dataset.status = status;
  card.dataset.priority = priority;

  const top = document.createElement('div');
  top.className = 'task-card-top';

  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = task.text;
  span.title = 'Натисніть, щоб редагувати';
  span.addEventListener('click', () => startEditing(span, task));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Видалити завдання';
  deleteBtn.addEventListener('click', () => {
    card.classList.add('removing');
    setTimeout(() => deleteTask(task.id), 200);
  });

  top.append(span, deleteBtn);

  const controls = document.createElement('div');
  controls.className = 'task-card-controls';

  const statusSelect = document.createElement('select');
  statusSelect.className = `status-select status-${status}`;
  statusSelect.title = 'Обрати статус';

  STATUS_ORDER.forEach((s) => {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = STATUS_META[s].label;
    if (s === status) option.selected = true;
    statusSelect.appendChild(option);
  });

  statusSelect.addEventListener('change', () => {
    const newStatus = statusSelect.value;
    updateTask(task.id, { status: newStatus });
    if (newStatus === 'done') {
      spawnConfetti(statusSelect);
    }
  });

  const prioritySelect = document.createElement('select');
  prioritySelect.className = `priority-select priority-${priority}`;
  prioritySelect.title = 'Пріоритет завдання';

  PRIORITY_ORDER.forEach((p) => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = PRIORITY_META[p].label;
    if (p === priority) option.selected = true;
    prioritySelect.appendChild(option);
  });

  prioritySelect.addEventListener('change', () => {
    updateTask(task.id, { priority: prioritySelect.value });
  });

  controls.append(statusSelect, prioritySelect);
  card.append(top, controls);
  return card;
}

function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  progressBar.style.width = `${percent}%`;

  if (total === 0) {
    progressLabel.textContent = '';
  } else if (percent === 100) {
    progressLabel.textContent = '🎉 Усі завдання виконано!';
  } else {
    progressLabel.textContent = `Прогрес: ${percent}%`;
  }

  if (total > 0 && percent === 100 && !updateProgress._celebrated) {
    updateProgress._celebrated = true;
    celebrateAll();
  } else if (percent < 100) {
    updateProgress._celebrated = false;
  }
}

// Невеликий вибух конфеті біля точки кліку
function spawnConfetti(originEl) {
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ['#764ba2', '#667eea', '#f6c744', '#f77f7f', '#5fd0a3'];

  for (let i = 0; i < 14; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 50;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 20;
    const rot = `${Math.floor(Math.random() * 360)}deg`;
    const size = 5 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];

    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.7}px`;
    piece.style.background = color;
    piece.style.setProperty('--dx', `${dx}px`);
    piece.style.setProperty('--dy', `${dy}px`);
    piece.style.setProperty('--rot', rot);

    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 950);
  }
}

// Більший салют, коли виконано абсолютно всі завдання
function celebrateAll() {
  const width = window.innerWidth;
  const colors = ['#764ba2', '#667eea', '#f6c744', '#f77f7f', '#5fd0a3'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';

    const startX = Math.random() * width;
    const dx = (Math.random() - 0.5) * 200;
    const dy = 200 + Math.random() * 200;
    const rot = `${Math.floor(Math.random() * 720)}deg`;
    const size = 6 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];

    piece.style.left = `${startX}px`;
    piece.style.top = '-10px';
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.7}px`;
    piece.style.background = color;
    piece.style.animationDuration = '1400ms';
    piece.style.setProperty('--dx', `${dx}px`);
    piece.style.setProperty('--dy', `${dy}px`);
    piece.style.setProperty('--rot', rot);

    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 1450);
  }
}

function startEditing(span, task) {
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = task.text;
  editInput.className = 'task-text-edit';
  editInput.style.width = '100%';
  editInput.style.padding = '4px 6px';
  editInput.style.fontSize = '14px';
  editInput.style.fontFamily = 'inherit';

  span.replaceWith(editInput);
  editInput.focus();

  const finishEdit = () => {
    const newText = editInput.value.trim();
    if (newText && newText !== task.text) {
      updateTask(task.id, { text: newText });
    } else {
      render();
    }
  };

  editInput.addEventListener('blur', finishEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') editInput.blur();
    if (e.key === 'Escape') render();
  });
}

function showError(message) {
  errorState.textContent = message;
  errorState.hidden = false;
}

function hideError() {
  errorState.hidden = true;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTask(text, priorityInput.value);
  input.value = '';
  priorityInput.value = 'medium';
});

clearCompletedBtn.addEventListener('click', () => {
  const hasCompleted = tasks.some((t) => t.completed);
  if (!hasCompleted) return;
  clearCompletedTasks();
});

loadTasks();