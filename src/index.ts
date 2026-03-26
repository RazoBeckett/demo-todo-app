import 'dotenv/config';
import express, { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import pg from 'pg';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use(express.static(join(__dirname, '..', 'public')));

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
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
