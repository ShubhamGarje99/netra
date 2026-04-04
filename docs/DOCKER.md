# Docker — Build & Deployment Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20

---

## Architecture

```
┌──────────────┐      ┌──────────────┐
│  Next.js App │:3000 │ FastAPI      │:8000
│  (Frontend)  │ ───► │ (Backend)    │
└──────────────┘      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │  drone-data  │
                      │  (volume)    │
                      └──────────────┘
```

---

## Commands

### Build & Run (Production)

```bash
docker compose up --build -d
```

### View Logs

```bash
docker compose logs -f          # all services
docker compose logs -f app      # frontend only
docker compose logs -f backend  # backend only
```

### Stop

```bash
docker compose down
```

### Rebuild a Single Service

```bash
docker compose up --build -d backend
```

### Clean Up Everything

```bash
docker compose down -v --rmi all
```

---

## Individual Images

### Frontend (Next.js)

```bash
docker build -t netra-app .
docker run -p 3000:3000 netra-app
```

### Backend (FastAPI)

```bash
docker build -t netra-backend ./backend
docker run -p 8000:8000 netra-backend
```

---

## Configuration

### Environment Variables

Variables are set in `docker-compose.yml` under each service's `environment` key. For local overrides, create a `.env` file in the project root:

```env
NODE_ENV=production
ENVIRONMENT=production
```

### Volumes

| Volume       | Mount Point  | Purpose                   |
| ------------ | ------------ | ------------------------- |
| `drone-data` | `/app/data`  | Persistent drone telemetry & incident data |

### Health Checks

Both services include health checks:

- **app** → `GET http://localhost:3000/`
- **backend** → `GET http://localhost:8000/health`

Docker will automatically restart unhealthy containers (configured via `restart: unless-stopped`).

---

## Production Notes

1. **Next.js standalone output** — The frontend Dockerfile depends on `output: "standalone"` in `next.config.ts`. This creates a self-contained `server.js` without needing `node_modules` at runtime.
2. **Non-root users** — Both images run as non-root (`nextjs` / `appuser`) for security.
3. **Multi-stage builds** — The frontend build uses three stages to keep the final image under ~150 MB.
4. **No secrets in images** — `.dockerignore` excludes `.env*` files. Pass secrets via environment variables or a secrets manager.
