# 🚀 PolyVerse AI

**Multi-Agent Intelligence Platform** — A ChatGPT-style interface with specialized AI agents powered by Groq's ultra-fast inference.

![PolyVerse AI](https://img.shields.io/badge/PolyVerse-AI-8b5cf6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNSIvPjxwYXRoIGQ9Ik0yIDEybDEwIDUgMTAtNSIvPjwvc3ZnPg==)

## 🧠 Architecture

```
User → Frontend (Next.js) → API Gateway (FastAPI) → Agent Router → Specialized Agents → Groq LLM → Response
```

## 🤖 AI Agents

| Agent | Purpose | Key Tech |
|-------|---------|----------|
| 📘 **Teaching Assistant** | RAG-powered education | FAISS + Sentence Transformers |
| 💻 **Code Expert** | Debug, optimize, explain code | Language detection + Groq |
| 💚 **Wellness Guide** | Empathetic mental health support | Sentiment analysis + Crisis detection |
| 👁️ **Vision Analyst** | Image OCR + understanding | EasyOCR + Groq Vision |
| 🌍 **Multilingual** | Translation + Indic languages | langdetect + LLM translation |
| ✨ **General Assistant** | General conversation | Groq LLM |

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, TailwindCSS v4, Zustand, TanStack Query
- **Backend**: Python FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **LLM**: Groq (primary), OpenAI (fallback)
- **Vector DB**: FAISS (for RAG)
- **OCR**: EasyOCR (multi-language, handwritten)
- **Speech**: OpenAI Whisper
- **Auth**: JWT + bcrypt

## 🚀 Quick Start

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

# Configure environment
cp .env.example .env  # Edit with your API keys
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Configure API Keys

Edit `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your_secret_key
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
docker-compose up -d
```

## 📡 API Endpoints

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

## 🔄 Chat Flow (SSE)

```
POST /api/chat → SSE Stream:
  data: {"type": "agent", "agent": "teaching"}
  data: {"type": "content", "content": "Quantum computing..."}
  data: {"type": "content", "content": " uses qubits..."}
  data: {"type": "done", "metadata": {"agent": "teaching"}}
```

## 📁 Project Structure

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
│   │   ├── rag/          # FAISS vector store
│   │   ├── multimodal/   # OCR + Whisper
│   │   ├── db/           # MongoDB connection
│   │   └── models/       # Pydantic schemas
│   └── ...
├── docker-compose.yml
└── README.md
```

## 📄 License

MIT
