const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readTasks() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, '[]', 'utf-8');
      return [];
    }
    throw err;
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let writeQueue = Promise.resolve();

function runExclusive(task) {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => {},
    () => {}
  );
  return result;
}

// --- REST API ---

// Отримати всі завдання
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося прочитати завдання' });
  }
});

// Додати нове завдання
app.post('/api/tasks', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Текст завдання не може бути порожнім' });
    }

    const newTask = await runExclusive(async () => {
      const tasks = await readTasks();
      const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      await writeTasks(tasks);
      return task;
    });

    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося додати завдання' });
  }
});

// Оновити завдання (текст та/або статус виконання)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;

    const result = await runExclusive(async () => {
      const tasks = await readTasks();
      const task = tasks.find((t) => t.id === id);

      if (!task) {
        return { notFound: true };
      }

      if (typeof text === 'string' && text.trim()) {
        task.text = text.trim();
      }
      if (typeof completed === 'boolean') {
        task.completed = completed;
      }

      await writeTasks(tasks);
      return { task };
    });

    if (result.notFound) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    res.json(result.task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося оновити завдання' });
  }
});

// Видалити всі виконані завдання одним атомарним записом.
app.delete('/api/tasks/completed', async (req, res) => {
  try {
    const removed = await runExclusive(async () => {
      const tasks = await readTasks();
      const remaining = tasks.filter((t) => !t.completed);
      const removedCount = tasks.length - remaining.length;
      if (removedCount > 0) {
        await writeTasks(remaining);
      }
      return removedCount;
    });

    res.json({ removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося очистити виконані завдання' });
  }
});

// Видалити одне завдання
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runExclusive(async () => {
      const tasks = await readTasks();
      const filtered = tasks.filter((t) => t.id !== id);
      if (filtered.length === tasks.length) {
        return { notFound: true };
      }
      await writeTasks(filtered);
      return { notFound: false };
    });

    if (result.notFound) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося видалити завдання' });
  }
});

app.listen(PORT, () => {
  console.log(`ToDo сервер запущено: http://localhost:${PORT}`);
});
