# PolyVerse AI Complete Application Documentation

## 1. Overview

PolyVerse AI is a multi-agent conversational application that combines a modern web chat interface with specialized backend agents for education, coding, wellness, vision, multilingual interaction, and general assistance. The application is designed to accept text, files, images, and audio, then route each request through the most appropriate agent or chain of agents before streaming the result back to the user.

The application is built as a full-stack system with:

- a Next.js frontend for user interaction
- a FastAPI backend for orchestration and APIs
- MongoDB for operational persistence
- Qdrant for retrieval-augmented document search
- Groq-hosted models for routing, generation, and image analysis
- local or container-local ML dependencies for OCR, speech transcription, and wellness inference

This document explains the application end to end:

- what the system does
- how the frontend and backend are structured
- how user requests move through the system
- how chat, file, image, voice, memory, and personalization data are handled
- how each agent works
- what is stored and where
- how security works today
- what important security limitations still exist

This document intentionally stays in a single file and does not split testing or operations into separate documents.

## 2. Business Purpose and Product Scope

PolyVerse AI is intended to function as a student-centered AI assistant that can also handle broader conversational tasks. Its current practical scope includes:

- explaining academic concepts
- answering questions from uploaded documents
- analyzing diagrams and image-based educational material
- transcribing spoken questions
- helping with code debugging and programming explanations
- responding to multilingual input
- providing supportive non-clinical wellness responses
- remembering lightweight user facts and preferences to personalize future responses

The system is not a medical device, not a therapist, and not a secure document vault. It is an AI application with chat-centric workflows and selective persistence.

## 3. Technology Stack

### Frontend

- Next.js 16
- React
- Tailwind CSS
- Zustand for conversation list state
- native `fetch` for API calls
- browser media APIs for voice capture
- browser speech synthesis for spoken replies

Key frontend files:

- [frontend/src/app/chat/page.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/app/chat/page.tsx)
- [frontend/src/app/chat/[id]/page.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/app/chat/[id]/page.tsx)
- [frontend/src/components/ChatInput.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatInput.tsx)
- [frontend/src/components/ChatMessages.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatMessages.tsx)
- [frontend/src/components/ChatLayout.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatLayout.tsx)
- [frontend/src/lib/api.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/lib/api.ts)
- [frontend/src/store/useChatStore.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/store/useChatStore.ts)

### Backend

- FastAPI
- Motor async MongoDB client
- Pydantic v2
- SlowAPI for rate limiting
- bcrypt for password hashing
- PyJWT for token handling

Key backend files:

- [backend/app/main.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/main.py)
- [backend/app/config.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/config.py)
- [backend/app/api/routes/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/auth.py)
- [backend/app/api/routes/chat.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/chat.py)
- [backend/app/api/routes/conversations.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/conversations.py)
- [backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py)
- [backend/app/api/middleware/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/auth.py)
- [backend/app/api/middleware/rate_limit.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/rate_limit.py)

### Model and Retrieval Layer

- Groq API for chat and vision reasoning
- Qdrant for vector retrieval
- sentence-transformers for embeddings
- EasyOCR for OCR
- Whisper for speech-to-text
- Hugging Face transformers pipelines for wellness inference
- langdetect for multilingual support heuristics

Relevant files:

- [backend/app/llm/groq_client.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/llm/groq_client.py)
- [backend/app/rag/retriever.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/rag/retriever.py)
- [backend/app/services/model_downloads.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/services/model_downloads.py)

## 4. System Architecture

At a high level, the system works like this:

1. The user interacts with the frontend.
2. The frontend authenticates the user and sends chat or file requests to the backend.
3. The backend validates the request and loads the user context.
4. The backend resolves any file references and retrieves conversation history.
5. The router selects one agent or a multi-agent chain.
6. The selected agent preprocesses the request and may call OCR, transcription, retrieval, or LLMs.
7. The backend streams the assistant response to the frontend via Server-Sent Events.
8. The backend stores the final assistant response and updates the conversation.

### Architectural Components

#### 4.1 Frontend Shell

The frontend provides:

- landing, auth, and registration flows
- chat shell and sidebar
- conversation list and conversation switching
- message composer
- file attachment UI
- mic recording UI
- streaming response rendering
- personalization modal

#### 4.2 API Layer

The FastAPI backend provides:

- auth endpoints
- conversation CRUD
- chat streaming endpoint
- file upload and transcription endpoints
- health endpoint

#### 4.3 Router Layer

The router decides how a request should be handled. It can:

- directly choose a single agent
- detect crisis content without calling an LLM
- build agent chains for multimodal flows

#### 4.4 Agent Layer

The agent layer contains the domain logic for:

- general assistant behavior
- teaching and RAG
- code reasoning
- wellness support
- vision analysis
- multilingual interaction

#### 4.5 Persistence Layer

MongoDB stores:

- users
- conversations
- messages
- file metadata
- lightweight durable user memories

Qdrant stores:

- embedded document chunks for retrieval

Disk storage stores:

- uploaded files
- temporary audio transcription files
- local model caches

## 5. Application Startup and Initialization

When the backend starts, [backend/app/main.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/main.py) performs the following:

1. Configures structured logging.
2. Connects to MongoDB.
3. Creates the upload directory if needed.
4. Initializes the agent router.
5. Attempts to initialize the retriever and Qdrant collection.
6. Mounts `/uploads` as a static file path.
7. Registers all API routers.

The retriever initialization is best-effort. If its dependencies or backend are unavailable, the application can still run without RAG, though document retrieval features will degrade.

## 6. Configuration Model

The application reads its runtime configuration from [backend/app/config.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/config.py).

Main configuration areas:

- Groq API keys and model names
- OpenAI fallback settings
- MongoDB URI and database name
- JWT secret and expiry
- CORS origins
- upload directory and max file size
- Qdrant connection and collection name
- OCR languages
- Whisper model
- IndicBERT model
- wellness emotion and sentiment models

The frontend reads `NEXT_PUBLIC_API_URL` and normalizes it in [frontend/src/lib/api.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/lib/api.ts) so it works whether the environment contains `/api` or just the backend base URL.

## 7. User and Authentication Flow

### 7.1 Registration

The registration flow is handled by:

- frontend registration page
- `POST /api/auth/register`

Backend behavior:

1. Validates the payload using Pydantic models from [backend/app/models/schemas.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/models/schemas.py).
2. Checks whether the email already exists.
3. Hashes the password using bcrypt.
4. Stores the user in MongoDB.
5. Issues a JWT access token.
6. Sets that token as an `HttpOnly` cookie.
7. Returns the token and normalized user data.

Stored user fields:

- `name`
- `email`
- `password_hash`
- `role`
- `language`
- `preferences`
- `created_at`

### 7.2 Login

The login flow:

1. User submits email and password.
2. Backend finds the user by email.
3. Backend verifies the bcrypt hash.
4. Backend issues a new JWT.
5. Backend sets the `HttpOnly` cookie and returns the user profile.

### 7.3 Auth Resolution in Requests

For authenticated requests, [backend/app/api/middleware/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/auth.py) resolves the current user from:

- `access_token` cookie first
- bearer token second

If the token is valid:

- the `sub` claim is used as the MongoDB user id
- the user is loaded from the `users` collection

There is also a special-case demo token path in the middleware. That is a convenience path, not a hardened production feature.

## 8. Frontend Application Flow

### 8.1 Chat Layout and Navigation

[frontend/src/components/ChatLayout.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatLayout.tsx) is the main shell around the chat pages. It is responsible for:

- auth check on chat pages
- loading conversation list
- sidebar sizing and collapse behavior
- conversation selection
- rename and delete actions
- user account menu
- personalization modal

### 8.2 Conversation List State

[frontend/src/store/useChatStore.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/store/useChatStore.ts) holds:

- conversation list
- active conversation id
- loading state
- error state

It also implements optimistic UI behavior for:

- renaming conversations
- deleting conversations

### 8.3 Chat Composer

[frontend/src/components/ChatInput.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatInput.tsx) handles:

- text input
- file attachments
- drag-and-drop upload
- voice recording
- transcription submission
- voice reply toggle
- message language determination

Message submission behavior:

1. gather text
2. gather uploaded file ids
3. gather uploaded file metadata for local UI display
4. compute language
5. include whether the message originated from voice
6. include whether spoken assistant replies are enabled
7. call the parent `onSendMessage`

### 8.4 Message Rendering

[frontend/src/components/ChatMessages.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatMessages.tsx) renders:

- user bubbles
- assistant markdown responses
- code blocks
- uploaded file previews
- streaming content
- timestamps

It also manages:

- initial scroll-to-bottom behavior
- auto-scroll pause/resume based on user interaction
- optional browser speech synthesis for assistant replies

## 9. API Surface and Request Contracts

### 9.1 Auth Endpoints

#### `POST /api/auth/register`

Purpose:

- create a new user account

Input fields:

- `name`
- `email`
- `password`
- `preferences`

Returns:

- `access_token`
- `token_type`
- `user`

#### `POST /api/auth/login`

Purpose:

- authenticate existing user

Input:

- `email`
- `password`

Returns:

- `access_token`
- `token_type`
- `user`

#### `POST /api/auth/logout`

Purpose:

- clear the auth cookie

#### `GET /api/auth/me`

Purpose:

- return the current authenticated user

#### `PUT /api/auth/me/preferences`

Purpose:

- update user personalization data

Updatable fields:

- `preferred_language`
- `academic_level`
- `course`
- `syllabus_topics`
- `learning_goals`
- `response_style`

### 9.2 Conversation Endpoints

#### `GET /api/conversations`

Returns:

- paginated list of user-owned conversations

#### `GET /api/conversations/{conversation_id}`

Returns:

- conversation metadata
- full message list

#### `POST /api/conversations`

Creates:

- a new empty conversation

#### `PUT /api/conversations/{conversation_id}`

Updates:

- currently only title and update timestamp

#### `DELETE /api/conversations/{conversation_id}`

Deletes:

- the conversation
- all associated messages

### 9.3 Chat Endpoint

#### `POST /api/chat`

This is the central endpoint of the application.

Input model:

- `conversation_id`
- `message`
- `files`
- `voice`
- `response_voice`
- `language`

The endpoint responds as a text/event-stream and emits structured SSE events.

Event types:

- `conversation_id`
- `agent`
- `content`
- `status`
- `done`
- `error`

### 9.4 File Endpoints

#### `POST /api/files/upload`

Purpose:

- upload a file and create a file reference for later use in chat

Returns:

- `id`
- `name`
- `type`
- `size`
- `url`

#### `POST /api/files/transcribe`

Purpose:

- upload audio and return transcribed text

Returns:

- `text`
- `language`
- `language_hint`

#### `GET /api/files/{file_id}`

Purpose:

- retrieve a stored file by file id

### 9.5 Health Endpoint

#### `GET /api/health`

Purpose:

- basic service liveness response

## 10. Data Models

The Pydantic request and response models live in [backend/app/models/schemas.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/models/schemas.py).

### 10.1 UserPreferences

Fields:

- `preferred_language`
- `academic_level`
- `course`
- `syllabus_topics`
- `learning_goals`
- `response_style`

### 10.2 UserCreate

Fields:

- `name`
- `email`
- `password`
- `preferences`

### 10.3 UserResponse

Fields:

- `_id`
- `name`
- `email`
- `role`
- `language`
- `preferences`
- `created_at`

### 10.4 ConversationResponse

Fields:

- `_id`
- `user_id`
- `title`
- `agent_type`
- `created_at`
- `updated_at`

### 10.5 MessageResponse

Fields:

- `_id`
- `conversation_id`
- `role`
- `content`
- `files`
- `agent`
- `metadata`
- `created_at`

### 10.6 ChatRequest

Fields:

- `conversation_id`
- `message`
- `files`
- `voice`
- `response_voice`
- `language`

## 11. MongoDB Data Storage

The backend uses MongoDB as its primary system of record.

### 11.1 `users` Collection

Stores account and preference data.

Typical fields:

```json
{
  "_id": "ObjectId",
  "name": "Syed Ahamed",
  "email": "user@example.com",
  "password_hash": "bcrypt hash",
  "role": "user",
  "language": "en",
  "preferences": {
    "preferred_language": "en",
    "academic_level": "1st year",
    "course": "B.E CSE",
    "syllabus_topics": ["arrays", "recursion"],
    "learning_goals": ["exam prep"],
    "response_style": "balanced"
  },
  "created_at": "UTC datetime"
}
```

### 11.2 `conversations` Collection

Stores one record per chat thread.

Typical fields:

```json
{
  "_id": "ObjectId",
  "user_id": "user object id or string form used in app flow",
  "title": "Explain recursion",
  "agent_type": "teaching",
  "created_at": "UTC datetime",
  "updated_at": "UTC datetime"
}
```

### 11.3 `messages` Collection

Stores each user or assistant message.

Typical fields:

```json
{
  "_id": "ObjectId",
  "conversation_id": "conversation id string",
  "role": "assistant",
  "content": "Recursive functions call themselves...",
  "files": [],
  "agent": "teaching",
  "metadata": {
    "reply_to_message_id": "message id",
    "language": "en",
    "voice": false,
    "response_voice": false,
    "routing": {
      "agent": "teaching",
      "chain": ["teaching"],
      "confidence": 0.9,
      "reasoning": "Document file attached"
    }
  },
  "created_at": "UTC datetime"
}
```

### 11.4 `files` Collection

Stores metadata about uploaded files.

Typical fields:

```json
{
  "_id": "uuid string",
  "user_id": "user id",
  "name": "chapter1.pdf",
  "type": "application/pdf",
  "size": 482123,
  "path": "./uploads/uuid.pdf",
  "url": "/uploads/uuid.pdf",
  "created_at": "UTC datetime"
}
```

### 11.5 `user_memories` Collection

Stores durable lightweight user facts.

Typical fields:

```json
{
  "_id": "ObjectId",
  "user_id": "user id",
  "key": "course",
  "value": "Data Structures",
  "kind": "profile",
  "created_at": "UTC datetime",
  "updated_at": "UTC datetime"
}
```

## 12. MongoDB Indexing

On startup, the backend creates indexes in [backend/app/db/mongodb.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/db/mongodb.py):

- `users.email` unique
- `conversations.user_id`
- `conversations.user_id + updated_at`
- `messages.conversation_id`
- `messages.conversation_id + created_at`
- `user_memories.user_id + key` unique
- `user_memories.user_id + updated_at`

These indexes support:

- account uniqueness
- fast conversation listing
- chronological message retrieval
- stable memory upsert behavior

## 13. File Storage and File Lifecycle

### 13.1 File Types Accepted

Allowed file types in [backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py) include:

- JPEG
- PNG
- GIF
- WebP
- SVG
- WebM/WAV/MP3/MPEG/OGG audio
- PDF
- plain text
- HTML
- CSS
- CSV
- DOC
- DOCX

Certain code files are also allowed by extension even if MIME detection is not explicit.

### 13.2 Upload Validation

The backend checks:

- MIME type or accepted extension
- max file size using the configured size limit

### 13.3 Save Path

Uploaded files are written to the configured `UPLOAD_DIR`.

Steps:

1. generate UUID
2. preserve extension
3. write bytes to disk
4. insert file metadata into MongoDB
5. return a file reference to the frontend

### 13.4 File Use in Chat

When the user sends a chat message with attached file ids:

1. frontend includes `files: [file_id, ...]`
2. backend loads matching file docs
3. backend builds file references
4. file refs are attached to the message history and agent input

### 13.5 File Rendering in Frontend

The frontend:

- shows chips for attached files before send
- renders thumbnails for image attachments in user messages
- resolves file URLs using `api.getUploadUrl`

## 14. Vector Retrieval and RAG

### 14.1 Qdrant Initialization

[backend/app/rag/retriever.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/rag/retriever.py) initializes:

- sentence-transformer embedder
- Qdrant client
- collection existence and vector dimension

If `QDRANT_URL` is not set, the retriever can run with a local on-disk Qdrant path.

### 14.2 Document Ingestion

Supported ingestion paths include:

- PDF via `pypdf`
- DOC/DOCX via `python-docx`
- text and code files via standard file reading

Process:

1. extract text
2. chunk text by word window
3. attach metadata such as source, page, chunk index, file id, user id
4. compute embeddings
5. upsert into Qdrant

### 14.3 Retrieval Flow

The teaching agent performs:

1. semantic search in Qdrant
2. optional file-id filtering
3. optional user-id filtering
4. relevance reranking by overlap
5. context assembly
6. source citation construction

## 15. Durable Memory and Personalization

### 15.1 Stored Preferences

Preferences are user-owned profile data edited from the UI and stored inside the user record.

These preferences are used to influence future prompts. Example impacts:

- preferred language influences response style
- academic level changes explanation complexity
- course and syllabus topics make educational answers more targeted
- learning goals bias the response objective
- response style adjusts answer tone and density

### 15.2 Durable Lightweight Memory

[backend/app/services/memory.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/services/memory.py) stores lightweight facts extracted from user text.

Patterns include:

- `remember that ...`
- `my name is ...`
- `I am studying ...`
- `I am a ... student`
- `my goal is ...`

These are stored as normalized key-value records and later converted into plain-text personalization context.

### 15.3 Prompt Injection of User Context

[backend/app/agents/base_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/base_agent.py) injects this personalization before processing:

- saved preferences
- saved user memories

This means later responses can reference:

- preferred language
- course context
- academic level
- remembered goals

without the user repeating them in every message.

## 16. Chat End-to-End Flow

The core chat flow lives in [backend/app/api/routes/chat.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/chat.py).

### 16.1 New Conversation Flow

If the request does not contain `conversation_id`:

1. backend inserts a conversation document
2. backend emits `conversation_id` SSE event
3. frontend stores that id
4. backend asynchronously generates a smarter title later using Groq

### 16.2 User Message Persistence

Before agent execution:

1. backend resolves attached files
2. backend stores the user message in MongoDB
3. backend persists any explicit memory facts
4. backend loads recent message history

### 16.3 Routing Inputs

The router receives:

- the text message
- whether the request has images
- whether it has voice/audio
- whether it has documents

### 16.4 Agent Input Construction

The backend constructs an `AgentInput` object containing:

- message
- conversation history
- file refs
- metadata
- language
- user id
- conversation id

It then enriches metadata with:

- user preferences
- remembered user facts
- personalization context string
- voice flags
- crisis state

### 16.5 Model Preparation and Warmup Status

Before execution, the backend may:

- emit `loading_model` status events
- preload Whisper
- preload wellness Hugging Face models

These status events drive frontend toasts.

### 16.6 Streaming Response

Single-agent path:

1. agent preprocesses input
2. agent streams chunks
3. backend forwards each chunk as SSE `content`

Chain path:

1. backend prepares each chain agent
2. backend invokes agents in order
3. previous output becomes context for the next agent
4. final output is tokenized and streamed back

### 16.7 Assistant Message Persistence

After generation:

1. backend stores assistant message
2. backend stores routing metadata
3. backend updates conversation `updated_at`
4. backend updates `agent_type`
5. backend emits `done`

## 17. Routing and Orchestration Logic

The router implementation is in [backend/app/agents/router.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/router.py).

### 17.1 Rule Priority

The router prioritizes:

1. crisis detection
2. image attachment detection
3. audio attachment detection
4. document attachment detection
5. code block detection
6. Indic or non-Latin heavy script detection
7. greeting detection
8. LLM fallback classification

### 17.2 Crisis Handling

Crisis pattern detection is regex-based and intentionally bypasses the LLM so severe wellness routing does not depend on model interpretation.

### 17.3 LLM Classification

If no rule resolves the request confidently:

- the router asks the Groq fast model to classify intent
- expected result is one of the six agent names plus confidence and reason

### 17.4 Chain Construction

The router can transform a primary decision into a chain:

- image + multilingual -> `vision -> multilingual`
- image + teaching -> `vision -> teaching`
- voice + multilingual -> `vision -> multilingual`
- voice + teaching/coding/wellness -> `vision -> target`
- document + multilingual -> `teaching -> multilingual`

## 18. Base Agent Contract

[backend/app/agents/base_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/base_agent.py) defines the execution contract for all agents.

### 18.1 Standard Input

Each agent receives:

- `message`
- `history`
- `files`
- `metadata`
- `language`
- `user_id`
- `conversation_id`

### 18.2 Standard Output

Each agent returns:

- `content`
- `agent_name`
- `confidence`
- `metadata`
- optional citations
- token counts and latency

### 18.3 Shared Behaviors

The base class provides:

- personalization context injection
- attached-file content injection
- retry logic
- timeout handling
- metrics tracking
- standard streaming and non-streaming entrypoints

### 18.4 Attached File Context Injection

Before an agent processes a request, the base class tries:

1. retrieval from Qdrant using attached file ids and user id
2. direct file parsing fallback

This means document content can become part of the agent prompt even outside the teaching agent, when appropriate.

## 19. Agent-Specific Processing

## 19.1 General Agent

File:

- [backend/app/agents/general_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/general_agent.py)

Purpose:

- handle ordinary conversation and uncategorized questions

Behavior:

- uses the general system prompt
- forwards history and message to Groq
- supports streaming and non-streaming replies

## 19.2 Teaching Agent

File:

- [backend/app/agents/teaching_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/teaching_agent.py)

Purpose:

- educational explanations
- exam-focused responses
- document-grounded answers

Behavior:

- retrieves context from Qdrant
- reranks by overlap
- detects difficulty level
- includes personalization such as academic level and syllabus topics
- constructs citation-aware prompts
- appends a final sources section

Difficulty modes inferred from text:

- beginner
- intermediate
- advanced
- exam_prep

## 19.3 Coding Agent

File:

- [backend/app/agents/coding_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/coding_agent.py)

Purpose:

- code explanation
- bug diagnosis
- code improvement
- algorithm reasoning

Behavior:

- extracts fenced code blocks
- detects probable programming language
- detects error patterns such as syntax or runtime problems
- estimates code complexity
- builds a structured prompt for Groq coding model
- requests root-cause-first explanations and runnable output

Detected analysis metadata includes:

- detected language
- whether errors are likely present
- error categories
- number of code blocks
- complexity hint

## 19.4 Wellness Agent

File:

- [backend/app/agents/wellness_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/wellness_agent.py)

Purpose:

- supportive mental wellness conversations
- basic emotional support
- crisis escalation messaging

Behavior:

- runs a safety assessment before generation
- detects risk level using critical, high, and moderate regexes
- uses lexicon plus optional transformer pipelines for emotion and sentiment
- can preload transformer models
- bypasses the LLM completely for critical crisis responses
- prepends a high-risk professional-support notice when needed

Risk levels:

- `none`
- `low`
- `moderate`
- `high`
- `critical`

Important limit:

- it is not a clinical system
- it does not diagnose or prescribe

## 19.5 Vision Agent

File:

- [backend/app/agents/vision_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/vision_agent.py)

Purpose:

- analyze images
- perform OCR
- transcribe audio
- create multimodal context for downstream agents

Behavior:

- lazy-loads EasyOCR
- lazy-loads Whisper
- extracts OCR text from images
- transcribes audio files
- base64-encodes images for Groq vision model
- creates a merged context block containing OCR, transcription, and vision analysis

It can operate as:

- final answering agent
- preprocessing agent for another chain target

## 19.6 Multilingual Agent

File:

- [backend/app/agents/multilingual_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/multilingual_agent.py)

Purpose:

- language-aware responses
- translation assistance
- code-switching support

Behavior:

- detects scripts via Unicode ranges
- uses `langdetect` as statistical fallback
- detects all likely languages present
- detects explicit translation intent
- adapts the response language to the user’s language
- can include romanization hints for non-Latin outputs

Supported language naming covers:

- English
- Hindi
- Tamil
- Telugu
- Kannada
- Malayalam
- Bengali
- Marathi
- Gujarati
- Punjabi
- Urdu
- Arabic
- and several global languages

## 20. Voice Processing Flow

Voice interaction has two distinct layers.

### 20.1 Frontend Audio Capture

The browser:

- requests microphone permission
- records audio with `MediaRecorder`
- collects chunks as `audio/webm`
- stops and creates a `File`

### 20.2 Backend Transcription

[backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py) handles transcription:

1. validates audio MIME type
2. writes a temporary file
3. loads Whisper
4. transcribes automatically
5. optionally forces the user-selected language
6. for supported Indic languages, compares outputs using an IndicBERT-based heuristic
7. returns normalized text

### 20.3 Voice-Aware Chat

After transcription:

- frontend inserts text into the input field
- if the user sends it, the request includes `voice: true`
- the backend can route through `vision` first when voice/audio semantics matter

### 20.4 Spoken Assistant Reply

If enabled in the UI:

- frontend uses browser speech synthesis to read assistant replies aloud

This is frontend speech output, not backend TTS generation.

## 21. Image Processing Flow

When an image is attached:

1. frontend uploads the image and receives a file reference
2. user submits chat with that file id
3. backend resolves the file metadata and local path
4. router recognizes `has_image`
5. vision agent preprocesses the file
6. OCR runs through EasyOCR
7. image is encoded and sent to Groq vision model
8. OCR and vision text are merged with the user prompt
9. result is answered directly or forwarded to another agent

Example:

- uploaded biology diagram + “Explain this for exam preparation”
- router chain becomes `vision -> teaching`
- vision extracts content
- teaching converts it into an educational explanation

## 22. Document Processing Flow

When a document is uploaded:

1. backend writes the file to disk
2. backend stores metadata
3. backend attempts best-effort ingestion into Qdrant
4. later teaching requests can retrieve relevant chunks
5. attached-file retrieval can also augment prompts in the base agent layer

The application therefore supports both:

- explicit document Q&A through the teaching path
- file-context augmentation in other agent flows

## 23. SSE Streaming Flow

The frontend does not wait for a single final JSON chat response. Instead, it consumes SSE.

### 23.1 Event Sequence

Typical stream order:

1. `conversation_id` if the chat is new
2. `agent` when routing decision is made
3. `status` while models warm up
4. repeated `content` chunks during generation
5. `done` on completion

Error path:

- `error`

### 23.2 Frontend Reaction

The frontend:

- immediately shows the user message
- updates the active agent indicator
- appends streamed content in real time
- shows loading toasts for model download/warmup
- converts the final stream into a stored assistant message in local state

## 24. Privacy and Data Handling

### 24.1 Data Collected

The application can collect and store:

- user name
- user email
- password hash
- chat messages
- uploaded files
- file metadata
- user preferences
- durable user memory facts
- conversation metadata

### 24.2 Data Stored in MongoDB

Persisted in MongoDB:

- accounts
- conversations
- messages
- file metadata
- memory records

### 24.3 Data Stored on Disk

Persisted on disk:

- uploaded file bytes
- temporary transcription files during processing
- ML model caches
- local Qdrant storage if local mode is used

### 24.4 Data Sent to External Services

Depending on the request, content may be sent to Groq:

- message text
- conversation history
- OCR results
- transcribed audio text
- attached file context
- retrieved document context
- personalization context
- image content in base64 URL form for vision requests

### 24.5 Data Reuse in Future Responses

User data can influence future outputs through:

- stored preferences
- stored memories
- previous messages in a conversation
- document chunks stored in retrieval index

### 24.6 Data Minimization Reality

The system does not currently implement strict minimization beyond practical relevance-based prompt assembly. If user context is available and relevant, it may be included in prompt context.

## 25. Security Controls Implemented

The following controls exist in the current codebase.

### 25.1 Password Hashing

- bcrypt hashes are stored instead of plaintext passwords

### 25.2 JWT Expiry

- tokens include expiry timestamps
- invalid or expired tokens are rejected

### 25.3 HttpOnly Cookie Support

- auth tokens are set as `HttpOnly` cookies

### 25.4 Conversation Ownership Checks

- conversation get, update, and delete endpoints verify the conversation belongs to the authenticated user

### 25.5 Unique Email Constraint

- duplicate account registration is prevented by a unique index

### 25.6 Rate Limiting

- SlowAPI applies a default limit of `60/minute`

### 25.7 CORS Configuration

- allowed origins are limited by configuration

### 26.1 Default JWT Secret Is Unsafe Until Changed

The default config still ships with:

- `JWT_SECRET = "change-this-in-production"`

This must be changed in real deployments.

### 26.3 File Authorization Is Incomplete

There are two separate concerns:

- `GET /api/files/{file_id}` does not enforce ownership before serving the file
- the chat route resolves attached file ids without checking that each file belongs to the current user

This means file-level authorization is weaker than conversation-level authorization.

### 26.4 Uploaded Files Are Served from a Static Mount

The application mounts `/uploads` publicly through FastAPI static files. That means the file path itself can become a direct access path if discovered.


### 26.6 No App-Level Encryption at Rest

The application does not encrypt:

- MongoDB records
- uploaded files
- vector-store payloads

Any at-rest protection depends on infrastructure outside the application.

### 26.7 No Malware or Deep Content Scanning

Uploaded files are validated by type and size only. The app does not currently perform:

- antivirus scanning
- document sanitization
- macro stripping
- advanced file inspection

### 26.8 Prompt Injection Exposure via User Files

Document text and retrieved chunks can be appended into prompt context. The system does not currently implement strong prompt-injection neutralization for untrusted uploaded content.

### 26.9 Role Field Exists but RBAC Does Not

Users have a `role` field, but the application does not implement a substantial role-based authorization model.

### 26.10 Hardcoded Secrets Risk

If deployment files contain direct API keys or secrets, that becomes a release and operational security problem even though it is outside normal runtime logic.

## 27. Reliability Characteristics

The application includes several reliability-oriented behaviors.

### 27.1 Retry Logic

Agents retry failed processing with exponential backoff.

### 27.2 Timeouts

Agents have per-agent timeout values.


### 27.4 User-Facing Status Feedback

During model warmup or download:

- backend emits status events
- frontend shows status toasts

### 27.5 Streaming UX

Streaming reduces perceived wait time and gives users visible progress during generation.


## 29. End-to-End Summary

PolyVerse AI operates as a layered conversational system:

1. the frontend captures user input, files, and voice
2. the backend authenticates the user and persists the request
3. routing logic chooses the best agent path
4. agents preprocess the request using retrieval, OCR, transcription, or language analysis
5. Groq and local models produce the final answer
6. the answer streams back over SSE
7. the assistant response is stored for future conversation continuity
8. personalization and durable memory shape future replies

In practical terms, the application already behaves as:

- a multi-agent chat platform
- a document-assisted educational tool
- a multimodal diagram and image explainer
- a code helper
- a multilingual assistant
- a lightweight personalized AI companion

At the same time, the real current system must still be understood as a development-to-early-production application, because file authorization and general security hardening are not yet complete.
