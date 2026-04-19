# PolyVerse AI

**Multi-Agent Intelligence Platform** — A ChatGPT-style interface with specialized AI agents powered by Groq's ultra-fast inference.

![PolyVerse AI](https://img.shields.io/badge/PolyVerse-AI-8b5cf6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNSIvPjxwYXRoIGQ9Ik0yIDEybDEwIDUgMTAtNSIvPjwvc3ZnPg==)

## Architecture

```
User → Frontend (Next.js) → API Gateway (FastAPI) → Agent Router → Specialized Agents → Groq LLM → Response
```

## AI Agents

| Agent | Purpose | Key Tech |
|-------|---------|----------|
| **Teaching Assistant** | RAG-powered education | FAISS + Sentence Transformers |
| **Code Expert** | Debug, optimize, explain code | Language detection + Groq |
| **Wellness Guide** | Empathetic mental health support | Sentiment analysis + Crisis detection |
| **Vision Analyst** | Image OCR + understanding | EasyOCR + Groq Vision |
| **Multilingual** | Translation + Indic languages | langdetect + LLM translation |
| **General Assistant** | General conversation | Groq LLM |

## Tech Stack

- **Frontend**: Next.js 16, TailwindCSS v4, Zustand, TanStack Query
- **Backend**: Python FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **LLM**: Groq (primary), OpenAI (fallback)
- **Vector DB**: Qdrant (for RAG)
- **OCR**: EasyOCR (multi-language, handwritten)
- **Speech**: OpenAI Whisper
- **Auth**: JWT + bcrypt

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)
- Groq API key ([get one here](https://console.groq.com))

### 1. Clone & Setup

```bash
git clone https://github.com/your-repo/PolyVerse-AI.git
cd PolyVerse-AI
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Configure Environment

For local development, export the values you need before starting the backend:

```bash
export GROQ_API_KEY=your_groq_api_key
export OPENAI_API_KEY=
export MONGODB_URI=mongodb://localhost:27017
export DATABASE_NAME=polyverse_ai
export JWT_SECRET=change-this-in-production
```

### 5. Run

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

### Docker (Alternative)

```bash
docker compose up -d
```

`docker-compose.yml` is configured for image-based deployment:

- `ahamednazeer/polyverse-ai:be-latest`
- `ahamednazeer/polyverse-ai:fe-latest`
- `mongo:7`

Build those images before starting Compose if they do not already exist:

```bash
docker build -t ahamednazeer/polyverse-ai:be-latest ./backend
docker build -t ahamednazeer/polyverse-ai:fe-latest ./frontend
```

The Compose file includes backend and frontend environment values directly, so it does not depend on `backend/.env`.

Persistent Docker volumes:

- `mongo_data` for MongoDB
- `backend_uploads` for uploaded files
- `backend_data` for app data
- `backend_cache` for downloaded model cache (Whisper and Hugging Face models)

### Docker Deployment

If the images are already published or available locally, start the stack with:

```bash
docker compose pull
docker compose up -d
```

To check container status:

```bash
docker compose ps
```

To view logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

To stop the stack:

```bash
docker compose down
```

To stop the stack without removing named volumes:

- `mongo_data`
- `backend_uploads`
- `backend_data`
- `backend_cache`

use the same `docker compose down` command above. Docker preserves named volumes unless you explicitly remove them.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user |
| POST | `/api/chat` | Send message (SSE stream) |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation + messages |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/health` | Health check |

## Chat Flow (SSE)

```
POST /api/chat → SSE Stream:
  data: {"type": "agent", "agent": "teaching"}
  data: {"type": "content", "content": "Quantum computing..."}
  data: {"type": "content", "content": " uses qubits..."}
  data: {"type": "done", "metadata": {"agent": "teaching"}}
```

## Project Structure

```
PolyVerse-AI/
├── frontend/             # Next.js 16
│   ├── src/
│   │   ├── app/          # Pages (layout, chat, login)
│   │   ├── components/   # UI, Chat, Sidebar, Markdown
│   │   ├── store/        # Zustand state management
│   │   ├── lib/          # API client, utilities
│   │   └── types/        # TypeScript types
│   └── ...
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── agents/       # All 6 AI agents + router
│   │   ├── api/routes/   # REST + SSE endpoints
│   │   ├── llm/          # Groq client + prompts
│   │   ├── rag/          # Qdrant retrieval
│   │   ├── services/     # Memory, model downloads
│   │   ├── db/           # MongoDB connection
│   │   └── models/       # Pydantic schemas
│   └── ...
├── docker-compose.yml
└── README.md
```

## License

MIT
