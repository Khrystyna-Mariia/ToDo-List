# ToDo List — frontend + backend

Веб-додаток «Список завдань» з окремим backend, який зберігає завдання
у файлі на сервері (`data/tasks.json`)

## Стек

- **Backend**: Node.js + Express — REST API (`/api/tasks`)
- **Сховище**: JSON-файл у файловій системі сервера (`data/tasks.json`)
- **Frontend**: чистий HTML/CSS/JavaScript

## Структура проєкту

```
todo-app/
├── server.js          # Express-сервер + REST API
├── package.json
├── data/
│   └── tasks.json     # тут зберігаються завдання (створюється автоматично)
└── public/
    ├── index.html
    ├── style.css
    └── app.js          # логіка frontend, звернення до API
```

## Запуск

```bash
cd todo-app
npm install
npm start
```

Потім відкрити в браузері: **http://localhost:3000**

## REST API

| Метод  | Endpoint            | Опис                                   |
|--------|----------------------|-----------------------------------------|
| GET    | `/api/tasks`         | Отримати всі завдання                   |
| POST   | `/api/tasks`         | Додати завдання (`{ "text": "..." }`)   |
| PUT    | `/api/tasks/:id`     | Оновити завдання (`text` та/або `completed`) |
| DELETE | `/api/tasks/completed` | Видалити всі виконані завдання одразу |
| DELETE | `/api/tasks/:id`     | Видалити завдання                       |

## Функціонал

- Додавання нових завдань
- Позначення завдань як виконаних (чекбокс)
- Редагування тексту завдання (клік по тексту)
- Видалення окремих завдань
- Фільтри: усі / активні / виконані
- Кнопка «Очистити виконані»