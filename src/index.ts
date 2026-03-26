import 'dotenv/config';
import express, { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import pg from 'pg';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

logger.info('Connecting to database...');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 40px 16px;
    }
    .container { width: 100%; max-width: 500px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; text-align: center; }
    .form { display: flex; gap: 8px; margin-bottom: 24px; }
    .form input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form input:focus { border-color: #333; }
    .form button {
      padding: 10px 20px;
      background: #333;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .form button:hover { background: #555; }
    .todo-list { display: flex; flex-direction: column; gap: 8px; }
    .todo {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fff;
      padding: 12px 14px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .todo input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #333;
      cursor: pointer;
      flex-shrink: 0;
    }
    .todo .title { flex: 1; font-size: 15px; word-break: break-word; }
    .todo.completed .title { text-decoration: line-through; color: #999; }
    .todo .delete {
      background: none;
      border: none;
      color: #ccc;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
      transition: color 0.2s;
    }
    .todo .delete:hover { color: #e74c3c; }
    .empty { text-align: center; color: #aaa; font-size: 14px; padding: 40px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todos</h1>
    <form class="form" id="todoForm">
      <input type="text" id="todoInput" placeholder="What needs to be done?" autocomplete="off" />
      <button type="submit">Add</button>
    </form>
    <div class="todo-list" id="todoList"></div>
  </div>
  <script>
    const API = '/todos';
    const list = document.getElementById('todoList');
    const form = document.getElementById('todoForm');
    const input = document.getElementById('todoInput');

    async function fetchTodos() {
      const res = await fetch(API);
      const todos = await res.json();
      render(todos);
    }

    function render(todos) {
      if (todos.length === 0) {
        list.innerHTML = '<div class="empty">No todos yet</div>';
        return;
      }
      list.innerHTML = todos.map(t => \`
        <div class="todo \${t.completed ? 'completed' : ''}" data-id="\${t.id}">
          <input type="checkbox" \${t.completed ? 'checked' : ''} onchange="toggle(\${t.id}, \${!t.completed})" />
          <span class="title">\${esc(t.title)}</span>
          <button class="delete" onclick="remove(\${t.id})">&times;</button>
        </div>
      \`).join('');
    }

    function esc(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = input.value.trim();
      if (!title) return;
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      input.value = '';
      fetchTodos();
    });

    async function toggle(id, completed) {
      await fetch(\`\${API}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      fetchTodos();
    }

    async function remove(id) {
      await fetch(\`\${API}/\${id}\`, { method: 'DELETE' });
      fetchTodos();
    }

    fetchTodos();
  </script>
</body>
</html>`);
});

app.get('/todos', async (_req: Request, res: Response) => {
  try {
    const allTodos = await db.select().from(todos);
    logger.info({ count: allTodos.length }, 'Fetched todos');
    res.json(allTodos);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch todos');
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.get('/todos/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const todo = await db.select().from(todos).where(eq(todos.id, id));
    if (todo.length === 0) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo[0]);
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Failed to fetch todo');
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

app.post('/todos', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const newTodo = await db.insert(todos).values({ title }).returning();
    logger.info({ todo: newTodo[0] }, 'Created todo');
    res.status(201).json(newTodo[0]);
  } catch (err) {
    logger.error({ err }, 'Failed to create todo');
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/todos/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, completed } = req.body;
    const updatedTodo = await db
      .update(todos)
      .set({ title, completed, updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning();
    if (updatedTodo.length === 0) return res.status(404).json({ error: 'Todo not found' });
    logger.info({ todo: updatedTodo[0] }, 'Updated todo');
    res.json(updatedTodo[0]);
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Failed to update todo');
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/todos/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deletedTodo = await db.delete(todos).where(eq(todos.id, id)).returning();
    if (deletedTodo.length === 0) return res.status(404).json({ error: 'Todo not found' });
    logger.info({ todo: deletedTodo[0] }, 'Deleted todo');
    res.json({ message: 'Todo deleted', todo: deletedTodo[0] });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Failed to delete todo');
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
