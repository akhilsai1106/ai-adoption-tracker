from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json, os, uuid

app = FastAPI(title="AI Adoption Tracker", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

DATA_FILE = "data/use_cases.json"

def load_data() -> List[dict]:
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(DATA_FILE):
        seed = [
            {"id": str(uuid.uuid4()), "title": "Automated Code Review", "description": "Using GitHub Copilot to review PRs and suggest improvements, reducing review time by 40%.", "team": "Platform Engineering", "ai_tool": "GitHub Copilot", "impact": "High", "category": "Developer Productivity", "submitted_by": "Arjun Mehta", "date": "2025-03-10", "upvotes": 24, "tags": ["code-review", "automation", "PRs"]},
            {"id": str(uuid.uuid4()), "title": "Customer Support Summarization", "description": "Claude summarizes long support tickets into 3-line briefs, agents resolve 2x faster.", "team": "Customer Success", "ai_tool": "Claude", "impact": "High", "category": "Support Automation", "submitted_by": "Priya Nair", "date": "2025-03-15", "upvotes": 31, "tags": ["summarization", "support", "efficiency"]},
            {"id": str(uuid.uuid4()), "title": "SQL Query Generation", "description": "Non-technical analysts use ChatGPT to write complex SQL queries, reducing dependency on data team.", "team": "Data Analytics", "ai_tool": "ChatGPT", "impact": "Medium", "category": "Data & Analytics", "submitted_by": "Rohit Sharma", "date": "2025-03-20", "upvotes": 18, "tags": ["sql", "analytics", "self-service"]},
            {"id": str(uuid.uuid4()), "title": "Release Notes Generator", "description": "Automated generation of release notes from git commit history using GPT-4.", "team": "Platform Engineering", "ai_tool": "GPT-4", "impact": "Medium", "category": "Developer Productivity", "submitted_by": "Sneha Patel", "date": "2025-04-01", "upvotes": 12, "tags": ["release-notes", "git", "documentation"]},
            {"id": str(uuid.uuid4()), "title": "Interview Question Bank", "description": "HR team uses Claude to generate role-specific interview questions aligned with job descriptions.", "team": "Human Resources", "ai_tool": "Claude", "impact": "Low", "category": "HR & Recruiting", "submitted_by": "Kavya Rao", "date": "2025-04-05", "upvotes": 9, "tags": ["hiring", "interviews", "HR"]},
            {"id": str(uuid.uuid4()), "title": "API Documentation Writer", "description": "Copilot generates OpenAPI docs from annotated code, saving ~3 hours per service launch.", "team": "Backend Services", "ai_tool": "GitHub Copilot", "impact": "High", "category": "Developer Productivity", "submitted_by": "Vikram Singh", "date": "2025-04-08", "upvotes": 27, "tags": ["documentation", "API", "openapi"]},
        ]
        with open(DATA_FILE, "w") as f:
            json.dump(seed, f, indent=2)
    with open(DATA_FILE) as f:
        return json.load(f)

def save_data(data: List[dict]):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

class UseCaseCreate(BaseModel):
    title: str
    description: str
    team: str
    ai_tool: str
    impact: str
    category: str
    submitted_by: str
    tags: Optional[List[str]] = []

# ── Pages ──────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ── API ────────────────────────────────────────────────────────
@app.get("/api/use-cases")
def get_use_cases(team: Optional[str] = None, ai_tool: Optional[str] = None,
                  impact: Optional[str] = None, search: Optional[str] = None):
    data = load_data()
    if team:
        data = [d for d in data if d["team"].lower() == team.lower()]
    if ai_tool:
        data = [d for d in data if d["ai_tool"].lower() == ai_tool.lower()]
    if impact:
        data = [d for d in data if d["impact"].lower() == impact.lower()]
    if search:
        q = search.lower()
        data = [d for d in data if q in d["title"].lower() or q in d["description"].lower()
                or q in d["team"].lower() or q in d["ai_tool"].lower()
                or any(q in t for t in d.get("tags", []))]
    return {"use_cases": data, "total": len(data)}

@app.post("/api/use-cases", status_code=201)
def create_use_case(payload: UseCaseCreate):
    data = load_data()
    new = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "description": payload.description,
        "team": payload.team,
        "ai_tool": payload.ai_tool,
        "impact": payload.impact,
        "category": payload.category,
        "submitted_by": payload.submitted_by,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "upvotes": 0,
        "tags": payload.tags or []
    }
    data.append(new)
    save_data(data)
    return new

@app.post("/api/use-cases/{use_case_id}/upvote")
def upvote(use_case_id: str):
    data = load_data()
    for item in data:
        if item["id"] == use_case_id:
            item["upvotes"] = item.get("upvotes", 0) + 1
            save_data(data)
            return {"upvotes": item["upvotes"]}
    raise HTTPException(status_code=404, detail="Not found")

@app.get("/api/metrics")
def get_metrics():
    data = load_data()
    teams = list({d["team"] for d in data})
    tools = {}
    for d in data:
        tools[d["ai_tool"]] = tools.get(d["ai_tool"], 0) + 1
    top_tools = sorted(tools.items(), key=lambda x: x[1], reverse=True)
    top_cases = sorted(data, key=lambda x: x.get("upvotes", 0), reverse=True)[:5]
    impact_dist = {"High": 0, "Medium": 0, "Low": 0}
    for d in data:
        impact_dist[d["impact"]] = impact_dist.get(d["impact"], 0) + 1
    return {
        "total_use_cases": len(data),
        "total_teams": len(teams),
        "teams": teams,
        "top_tools": [{"tool": k, "count": v} for k, v in top_tools],
        "top_cases": top_cases,
        "impact_distribution": impact_dist,
    }

@app.get("/api/filters")
def get_filters():
    data = load_data()
    return {
        "teams": sorted(list({d["team"] for d in data})),
        "ai_tools": sorted(list({d["ai_tool"] for d in data})),
        "impacts": ["High", "Medium", "Low"],
        "categories": sorted(list({d["category"] for d in data})),
    }
