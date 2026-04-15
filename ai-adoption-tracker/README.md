# AI Adoption Tracker

A full-stack application to capture, discover, and measure AI adoption across your engineering organization.

## Features

- **Submit** AI use cases with team, tool, impact level, and tags
- **Dashboard** — filter use cases by team, AI tool, and impact
- **Discover** — full-text search across all use cases
- **Metrics** — live stats: total cases, teams, top tools, impact distribution

---

## Running Locally

### Option A — Python directly

```bash
pip install -r requirements.txt
cd app
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000

### Option B — Docker Compose

```bash
docker compose up --build
```

Open http://localhost:8000

---

## Project Structure

```
ai-adoption-tracker/
├── app/
│   └── main.py              # FastAPI backend
├── static/
│   ├── css/style.css        # Styles
│   └── js/app.js            # Frontend logic
├── templates/
│   └── index.html           # Main HTML template
├── data/                    # JSON file storage (auto-created)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .github/
    └── workflows/
        └── docker-publish.yml   # CI/CD pipeline
```

---

## GitHub Actions Setup (Docker Hub)

The workflow builds a Docker image and pushes it to Docker Hub on every push to `main`.

### Step 1 — Create a Docker Hub account & token

1. Sign up at https://hub.docker.com
2. Go to **Account Settings → Security → New Access Token**
3. Copy the token

### Step 2 — Add GitHub Secrets

In your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name         | Value                        |
|---------------------|------------------------------|
| `DOCKERHUB_USERNAME`| Your Docker Hub username     |
| `DOCKERHUB_TOKEN`   | Your Docker Hub access token |

### Step 3 — Push to main

```bash
git init
git add .
git commit -m "feat: initial AI adoption tracker"
git remote add origin https://github.com/YOUR_USERNAME/ai-adoption-tracker.git
git push -u origin main
```

The workflow will trigger automatically. Check the **Actions** tab in GitHub.

### Step 4 — Pull and run anywhere

```bash
docker pull YOUR_DOCKERHUB_USERNAME/ai-adoption-tracker:latest
docker run -d -p 8000:8000 -v ai_data:/app/data YOUR_DOCKERHUB_USERNAME/ai-adoption-tracker:latest
```

---

## Optional: Deploy to a Server

Add these secrets to enable automatic SSH deployment:

| Secret Name       | Value                    |
|-------------------|--------------------------|
| `SSH_HOST`        | Your server IP           |
| `SSH_USER`        | SSH username (e.g. ubuntu)|
| `SSH_PRIVATE_KEY` | Your SSH private key     |

If `SSH_HOST` is not set, the deploy job is skipped automatically.

---

## API Reference

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/use-cases`                | List all use cases       |
| POST   | `/api/use-cases`                | Submit a new use case    |
| POST   | `/api/use-cases/{id}/upvote`    | Upvote a use case        |
| GET    | `/api/metrics`                  | Get adoption metrics     |
| GET    | `/api/filters`                  | Get filter options       |

Query params for GET `/api/use-cases`: `team`, `ai_tool`, `impact`, `search`
