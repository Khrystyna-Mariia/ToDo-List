const API_URL = '/api/tasks';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const taskCount = document.getElementById('task-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('.filter-btn');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const confettiLayer = document.getElementById('confetti-layer');

let tasks = [];
let currentFilter = 'all';

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

async function addTask(text) {
  try {
    const newTask = await apiRequest(API_URL, {
      method: 'POST',
      body: JSON.stringify({ text }),
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

// --- Рендеринг ---

function getFilteredTasks() {
  if (currentFilter === 'active') return tasks.filter((t) => !t.completed);
  if (currentFilter === 'completed') return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  const filtered = getFilteredTasks();
  list.innerHTML = '';

  filtered.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;

    const checkWrap = document.createElement('label');
    checkWrap.className = 'check-wrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      const willBeCompleted = checkbox.checked;
      updateTask(task.id, { completed: willBeCompleted });
      if (willBeCompleted) {
        li.classList.add('just-completed');
        setTimeout(() => li.classList.remove('just-completed'), 400);
        spawnConfetti(checkWrap);
      }
    });

    const checkBoxVisual = document.createElement('span');
    checkBoxVisual.className = 'check-box';

    const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkIcon.setAttribute('class', 'check-icon');
    checkIcon.setAttribute('viewBox', '0 0 22 22');
    checkIcon.innerHTML = '<path d="M5 11.5 L9.5 16 L17 6" />';

    checkWrap.append(checkbox, checkBoxVisual, checkIcon);

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;
    span.title = 'Натисніть, щоб редагувати';
    span.addEventListener('click', () => startEditing(span, task));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Видалити завдання';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkWrap, span, deleteBtn);
    list.appendChild(li);
  });

  emptyState.hidden = filtered.length !== 0;

  const activeCount = tasks.filter((t) => !t.completed).length;
  taskCount.textContent = `Активних: ${activeCount} з ${tasks.length}`;

  updateProgress();
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
  editInput.style.flex = '1';
  editInput.style.padding = '4px 6px';
  editInput.style.fontSize = '15px';

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
  addTask(text);
  input.value = '';
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearCompletedBtn.addEventListener('click', () => {
  const hasCompleted = tasks.some((t) => t.completed);
  if (!hasCompleted) return;
  clearCompletedTasks();
});

loadTasks();
