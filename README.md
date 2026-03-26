# Todo App

A simple todo application built with Express.js, Drizzle ORM, PostgreSQL, and Pino logging.

## Features

- Create, read, update, and delete todos
- Mark todos as completed
- Clean web UI served directly from Express
- Structured logging with Pino
- Type-safe database queries with Drizzle ORM

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Logging**: Pino + pino-pretty
- **Containerization**: Docker + Docker Compose

## Quick Start

### With Docker (Recommended)

```bash
# Clone and navigate to the project
cd todo-app

# Start everything with Docker Compose
docker-compose up
```

The app will be available at http://localhost:3000

### Without Docker

**Prerequisites:**
- Node.js 20+
- PostgreSQL running locally
- pnpm installed

**Setup:**

```bash
# Install dependencies
pnpm install

# Create the database
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE \"todo-app\";"

# Push schema to database
pnpm db:push

# Run in development mode
pnpm dev
```

Visit http://localhost:3000

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run with hot reload |
| `pnpm start` | Run production build |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serve the web UI |
| GET | `/todos` | List all todos |
| GET | `/todos/:id` | Get a single todo |
| POST | `/todos` | Create a new todo |
| PUT | `/todos/:id` | Update a todo |
| DELETE | `/todos/:id` | Delete a todo |

## Project Structure

```
prj/
├── src/
│   ├── index.ts          # Main server file with UI + API
│   └── schema.ts         # Drizzle database schema
├── drizzle.config.ts     # Drizzle configuration
├── Dockerfile            # Docker image definition
├── docker-compose.yml    # Docker Compose setup
├── .env                  # Environment variables
└── package.json
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/todo-app` |
| `PORT` | Server port | `3000` |

## License

MIT
