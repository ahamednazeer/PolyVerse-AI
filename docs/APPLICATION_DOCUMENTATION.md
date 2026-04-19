# PolyVerse AI Application Documentation

## 1. Purpose

PolyVerse AI is a multi-agent academic and general-purpose AI assistant with a ChatGPT-style interface. It supports:

- text chat
- educational question answering
- code help
- wellness-oriented responses
- image understanding
- document-assisted retrieval
- multilingual interaction
- voice transcription
- lightweight personalization and durable user memory

The system is split into:

- a Next.js frontend for authentication, chat, file upload, and account personalization
- a FastAPI backend for authentication, routing, agent execution, file ingestion, streaming, and storage
- MongoDB for users, conversations, messages, file metadata, and memory
- Qdrant plus sentence-transformers for retrieval-augmented generation
- Groq-hosted LLMs for routing, generation, and image reasoning
- local model integrations for Whisper, EasyOCR, and some Hugging Face pipelines

This document explains how the application works end to end, how data is handled, how requests are processed, and what security controls exist today.

## 2. High-Level Architecture

### Frontend

The frontend is built with Next.js 16 and acts as the user-facing application shell.

Main responsibilities:

- login and registration
- chat UI
- streaming response rendering
- file upload and voice capture
- conversation list management
- personalization settings management
- browser-side voice playback for assistant replies

Key frontend files:

- [frontend/src/app/chat/page.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/app/chat/page.tsx)
- [frontend/src/components/ChatInput.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatInput.tsx)
- [frontend/src/components/ChatMessages.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatMessages.tsx)
- [frontend/src/components/ChatLayout.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatLayout.tsx)
- [frontend/src/lib/api.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/lib/api.ts)
- [frontend/src/store/useChatStore.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/store/useChatStore.ts)

### Backend

The backend is built with FastAPI and owns the application logic.

Main responsibilities:

- JWT authentication
- cookie and bearer-token auth handling
- chat orchestration
- conversation CRUD
- file upload and transcription
- agent routing
- agent execution
- retrieval-augmented generation
- personalization and memory injection
- SSE response streaming

Key backend files:

- [backend/app/main.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/main.py)
- [backend/app/api/routes/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/auth.py)
- [backend/app/api/routes/chat.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/chat.py)
- [backend/app/api/routes/conversations.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/conversations.py)
- [backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py)
- [backend/app/agents/router.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/router.py)
- [backend/app/agents/base_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/base_agent.py)

### Storage and Model Layers

- MongoDB: operational data
- Qdrant: document embeddings and retrieval
- Groq API: LLM routing, chat generation, vision reasoning
- Whisper: speech-to-text
- EasyOCR: OCR from images
- sentence-transformers: embeddings for retrieval
- Hugging Face transformer models: wellness model preload path and sentiment/emotion support

## 3. Main Functional Modules

### 3.1 Authentication

Authentication uses email/password plus JWT issuance.

Flow:

1. User registers or logs in from the frontend.
2. Backend validates credentials.
3. Passwords are stored as bcrypt hashes.
4. Backend issues a JWT access token.
5. Token is returned in the JSON response and also set as an `HttpOnly` cookie.
6. Subsequent requests authenticate through either:
   - `access_token` cookie
   - `Authorization: Bearer <token>`

Relevant files:

- [backend/app/api/routes/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/auth.py)
- [backend/app/api/middleware/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/auth.py)

### 3.2 Conversations and Messages

Conversations are stored separately from messages.

Each conversation contains:

- owner user id
- title
- last active agent type
- timestamps

Each message contains:

- conversation id
- role (`user` or `assistant`)
- content
- referenced files
- agent metadata
- timestamps

Conversation title generation:

- when a new conversation is created by chat, the initial title is derived from the first prompt
- a background task later asks Groq to generate a short smart title

Relevant files:

- [backend/app/api/routes/chat.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/chat.py)
- [backend/app/api/routes/conversations.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/conversations.py)

### 3.3 File Handling

Users can upload:

- images
- audio
- PDFs
- text and code files
- Word documents

Upload flow:

1. Frontend sends multipart file data.
2. Backend validates content type and file size.
3. File is saved on disk under the configured upload directory.
4. File metadata is written to MongoDB.
5. If the file is indexable and the retriever is ready, the backend ingests it into Qdrant.

Relevant file:

- [backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py)

### 3.4 Agent System

The backend exposes a router and six main agent types:

- `general`
- `teaching`
- `coding`
- `wellness`
- `vision`
- `multilingual`

The router uses:

- crisis keyword detection
- rule-based fast classification
- LLM-based fallback classification
- chain building for multimodal or multilingual cases

Examples of chains:

- image + learning request -> `vision -> teaching`
- voice + multilingual request -> `vision -> multilingual`
- voice + coding request -> `vision -> coding`

Relevant files:

- [backend/app/agents/router.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/router.py)
- [backend/app/agents/base_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/base_agent.py)

### 3.5 Retrieval-Augmented Generation

The teaching pipeline can pull document context from Qdrant.

Retrieval flow:

1. Uploaded documents are chunked.
2. Each chunk is embedded with `sentence-transformers/all-MiniLM-L6-v2`.
3. Embeddings are written to a Qdrant collection.
4. During a teaching request, the retriever searches for top relevant chunks.
5. Results are reranked with simple keyword overlap.
6. Context is injected into the teaching prompt.
7. The agent adds a sources block to the final answer.

Relevant files:

- [backend/app/rag/retriever.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/rag/retriever.py)
- [backend/app/agents/teaching_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/teaching_agent.py)

### 3.6 Personalization and Memory

The system supports two personalization layers.

#### Stored Preferences

User profile preferences include:

- preferred language
- academic level
- course
- syllabus topics
- learning goals
- response style

These are stored in the `users` collection and edited from the personalization UI.

#### Durable Lightweight Memory

The system also extracts and stores explicit user facts such as:

- "remember that ..."
- "I am studying ..."
- "I am a second year student"
- "my goal is ..."

These are stored in `user_memories` and injected into future prompts.

Relevant files:

- [backend/app/services/memory.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/services/memory.py)
- [backend/app/api/routes/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/auth.py)
- [backend/app/agents/base_agent.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/agents/base_agent.py)

## 4. End-to-End Request Flow

## 4.1 User Registration and Login

1. User submits name, email, password, and optional preferences.
2. Backend checks whether the email already exists.
3. Backend hashes the password with bcrypt.
4. Backend inserts the user document into MongoDB.
5. Backend returns the user profile plus JWT.
6. JWT is stored client-side in the API client and also set as an `HttpOnly` cookie.

## 4.2 Starting a New Chat

1. User opens the chat page.
2. Frontend checks authentication with `/api/auth/me`.
3. When the first message is sent:
   - frontend shows the user message immediately
   - frontend calls `/api/chat`
4. Backend creates a conversation if one does not already exist.
5. Backend emits an SSE `conversation_id` event.
6. Frontend binds subsequent messages to that conversation id.

## 4.3 Sending a Text Message

1. Frontend sends:
   - message text
   - optional conversation id
   - selected language
   - voice flags
   - optional file ids
2. Backend stores the user message in MongoDB.
3. Backend persists any explicit memory facts found in the message.
4. Backend loads the last portion of conversation history.
5. Backend resolves file metadata.
6. Backend determines whether the request includes image, voice, or document context.
7. Router selects the agent or agent chain.
8. Backend emits an `agent` SSE event.
9. Backend prepares agent models if needed.
10. Backend streams content chunks through SSE.
11. Backend stores the assistant message in MongoDB.
12. Backend updates the conversation record.
13. Backend emits a final `done` SSE event.

## 4.4 Sending a Voice Query

There are two voice-related flows.

### Voice-to-Text Input Flow

1. User records audio in the browser.
2. Frontend uploads the audio to `/api/files/transcribe`.
3. Backend temporarily writes the audio file.
4. Whisper transcribes the speech.
5. For supported Indian languages, the backend uses an IndicBERT-based heuristic to choose the better transcript.
6. Frontend inserts the transcript into the text input.
7. User sends the message as normal chat text.

### Voice-Aware Chat Flow

When the message is marked as voice-originated:

- the backend may route through `vision` first for audio handling
- the chat metadata stores `voice` and `response_voice`
- the frontend can speak the assistant reply using browser speech synthesis

## 4.5 Sending an Image

1. User uploads an image.
2. File is stored and referenced in MongoDB.
3. During chat, the `vision` agent runs:
   - OCR using EasyOCR
   - optional Groq vision model analysis using a base64 image data URL
4. OCR text and vision analysis are merged into the request context.
5. The final reasoning can remain in `vision` or chain into another agent such as `teaching`.

## 4.6 Sending a Document

1. User uploads a PDF, Word doc, text file, or code file.
2. Backend stores the file and metadata.
3. If supported, backend extracts text and chunks it.
4. Chunks are embedded and saved in Qdrant.
5. During later teaching requests, the retriever searches only matching file ids and user id where available.
6. Retrieved chunks are appended to the prompt as context.

## 5. Data Model and Storage

## 5.1 MongoDB Collections

### `users`

Stores:

- name
- email
- bcrypt password hash
- role
- preferred language
- preferences object
- created timestamp

### `conversations`

Stores:

- owner user id
- conversation title
- last/active agent type
- created timestamp
- updated timestamp

### `messages`

Stores:

- conversation id
- role
- text content
- file references
- agent name
- routing and language metadata
- timestamps

### `files`

Stores:

- generated file id
- user id
- original file name
- content type
- size
- local file path
- public URL path
- created timestamp

### `user_memories`

Stores:

- user id
- memory key
- memory value
- memory kind
- created timestamp
- updated timestamp

## 5.2 Indexes

The backend creates indexes on startup for:

- `users.email` unique
- `conversations.user_id`
- `conversations.user_id + updated_at`
- `messages.conversation_id`
- `messages.conversation_id + created_at`
- `user_memories.user_id + key` unique
- `user_memories.user_id + updated_at`

Source:

- [backend/app/db/mongodb.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/db/mongodb.py)

## 5.3 File Storage

Uploaded files are saved to the configured upload directory on disk. MongoDB stores only metadata and the resolved server path.

Important implication:

- message history and file metadata survive as long as MongoDB survives
- actual file contents depend on the upload directory remaining intact

## 5.4 Vector Storage

Qdrant stores:

- chunk embeddings
- chunk text
- source label
- per-file metadata such as file id and user id

This is used only for retrieval, not as the system of record for conversations.

## 6. Processing Pipelines

## 6.1 Router Pipeline

The router follows this sequence:

1. crisis regex check
2. rule-based fast path:
   - images
   - audio
   - documents
   - code blocks
   - Indic scripts
   - greetings
3. Groq fast-model classifier fallback
4. chain construction for multimodal requests

This design reduces cost and latency for obvious cases.

## 6.2 Base Agent Pipeline

All agents inherit a common contract.

Execution flow:

1. personalization context injection
2. attached file context injection
3. optional `preprocess`
4. `process` or `stream`
5. optional `postprocess`
6. metrics recording
7. retries and timeout handling on failure

The base agent also:

- handles streaming and non-streaming paths
- records latency and request counts
- implements retry logic with backoff

## 6.3 Teaching Pipeline

1. retrieve relevant context from Qdrant
2. rerank by relevance plus keyword overlap
3. infer difficulty level from the request
4. merge personalization context
5. build Groq prompt
6. generate answer
7. append normalized sources block

## 6.4 Vision Pipeline

1. inspect attached files
2. for images:
   - run OCR with EasyOCR
   - base64-encode image
   - call Groq vision model
3. for audio:
   - run Whisper STT
4. merge OCR, STT, and vision analysis into one enhanced prompt
5. call Groq text model for final answer or forward into another agent

## 6.5 Voice Transcription Pipeline

1. frontend records `audio/webm`
2. backend writes temporary file
3. Whisper transcribes
4. backend optionally forces selected language and compares transcript quality
5. frontend receives transcript and places it into the text input

## 7. Frontend Runtime Behavior

## 7.1 Chat State

The frontend stores:

- conversation list in Zustand
- current active conversation id
- current streaming content in React state
- upload state
- recording state
- personalization form state

Conversation list operations include:

- fetch
- optimistic rename
- optimistic delete

Source:

- [frontend/src/store/useChatStore.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/store/useChatStore.ts)

## 7.2 Streaming UX

The frontend consumes SSE events with types such as:

- `conversation_id`
- `agent`
- `content`
- `status`
- `done`
- `error`

Effects:

- agent badge updates immediately
- streamed content is appended incrementally
- loading toasts are shown when models are being prepared or downloaded
- final message is committed when the `done` event arrives

Source:

- [frontend/src/app/chat/page.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/app/chat/page.tsx)
- [frontend/src/lib/api.ts](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/lib/api.ts)

## 7.3 Personalization UX

The account menu opens a personalization modal where the user can edit:

- preferred language
- academic level
- course
- syllabus topics
- learning goals
- response style

These values are sent to `PUT /api/auth/me/preferences`.

Source:

- [frontend/src/components/ChatLayout.tsx](/Users/syed.ahamed/skillup/PolyVerse-AI/frontend/src/components/ChatLayout.tsx)

## 8. Security Model

This section describes the security posture as implemented today, not an idealized design.

## 8.1 Controls Already Implemented

### Password Hashing

- passwords are hashed with bcrypt before storage
- plaintext passwords are not stored

Source:

- [backend/app/api/middleware/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/auth.py)

### JWT-Based Authentication

- access tokens include `sub`, `email`, `iat`, and `exp`
- token expiry is enforced during decode

### HttpOnly Cookie Support

- login and register set `access_token` as an `HttpOnly` cookie
- this reduces direct JavaScript access to the cookie

### Conversation Ownership Checks

Conversation routes check that the conversation belongs to the authenticated user before:

- read
- update
- delete

### Unique User Identity Constraint

- `users.email` is unique

### Basic Rate Limiting

- application uses `slowapi`
- default limit is `60/minute`

### CORS Restrictions

- cross-origin requests are limited to configured origins

## 8.2 Important Security Limitations and Risks

These are important to document because they materially affect how secure the system currently is.

### 1. Default Secrets Are Unsafe for Production

The configuration still ships with a default JWT secret:

- `JWT_SECRET = "change-this-in-production"`

If deployed with that unchanged, token forgery risk is severe.

Source:

- [backend/app/config.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/config.py)

### 2. Demo Token Bypass Exists

The auth middleware accepts the literal token `demo-token` and returns a synthetic user.

That is useful for demos, but it is not appropriate for production unless explicitly isolated.

Source:

- [backend/app/api/middleware/auth.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/middleware/auth.py)

### 3. Uploaded Files Are Mounted as Static Public Files

The backend mounts the upload directory as static files at `/uploads`.

That means files are effectively public by path once the filename is known, unless protected elsewhere.

Source:

- [backend/app/main.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/main.py)

### 4. File Access Control Is Incomplete

The dedicated file fetch route does not verify file ownership, and the chat route resolves attached files by file id without checking that the file belongs to the current user.

That means there is a risk of cross-user file reference if an attacker can obtain another file id.

Sources:

- [backend/app/api/routes/files.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/files.py)
- [backend/app/api/routes/chat.py](/Users/syed.ahamed/skillup/PolyVerse-AI/backend/app/api/routes/chat.py)

### 5. No CSRF Protection Layer Is Present

Because the application supports cookie-based auth and `allow_credentials=True`, production deployments should have explicit CSRF protection if cookies are relied on for browser auth.

Current code does not implement a CSRF token or same-origin mutation guard.

### 6. No At-Rest Encryption Layer Is Implemented in App Code

The application does not encrypt:

- MongoDB records at application level
- uploaded files at application level
- Qdrant payloads at application level

Security at rest depends on infrastructure choices outside the app.

### 7. No Role-Based Authorization Beyond Basic User Identity

The current app has a `role` field but does not implement meaningful role-based access control paths.

### 8. Input Validation Is Basic, Not Hardened

Pydantic validates request shapes and file type allowlists exist, but the system does not currently include:

- antivirus scanning
- content disarm
- deep MIME inspection
- prompt injection defenses for uploaded document content

### 9. Logging May Expose Operational Detail

The app runs in debug-friendly mode by default and uses fairly verbose logging. This is useful during development but should be tightened for production.

## 8.3 Security Posture Summary

Current posture is suitable for development, demos, and controlled internal testing, but it is not fully hardened for a public production deployment.

Strengths:

- bcrypt password hashing
- JWT expiry handling
- conversation ownership checks
- basic rate limiting
- origin-controlled CORS

Main gaps to fix before serious production use:

- remove demo-token bypass
- replace default JWT secret
- enforce file ownership on all file access paths
- stop serving uploads as public static assets or sign access
- add CSRF protection if cookie auth is used in browser flows
- tighten logging and debug defaults
- add malware scanning and stricter upload validation

## 9. Data Privacy and Handling Summary

### User Data Collected

- name
- email
- hashed password
- chat messages
- uploaded files
- conversation metadata
- preferences
- explicit memory facts derived from user statements

### How Data Is Used

- authentication and account access
- chat history continuity
- personalization of responses
- retrieval from uploaded documents
- multimodal processing for images and voice

### How Data Flows to Models

Depending on the request, the following may be sent into model context:

- user message
- recent conversation history
- attached-file text
- OCR text
- speech transcription
- retrieved document chunks
- stored preferences
- lightweight user memories

Important implication:

Model context can contain personal or uploaded data if that data is relevant to the request.

## 10. Reliability and Operational Behavior

### Startup Behavior

On backend startup:

- logging is configured
- MongoDB connects
- upload directory is created
- agent router is initialized
- retriever initialization is attempted

### Failure Handling

- agent invoke path retries failures with exponential backoff
- timeouts are enforced per agent
- chat stream returns SSE error payloads on failure
- document indexing is best-effort and does not block upload success

### Performance-Oriented Choices

- fast-path routing avoids unnecessary LLM calls
- streaming reduces perceived latency
- model warmup notices improve UX during first-time downloads
- conversation lists use indexes and pagination

## 11. API Surface Summary

Core endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me/preferences`
- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `POST /api/conversations`
- `PUT /api/conversations/{id}`
- `DELETE /api/conversations/{id}`
- `POST /api/files/upload`
- `POST /api/files/transcribe`
- `GET /api/files/{file_id}`
- `GET /api/health`

## 12. Current Functional Scope

Implemented well enough to demonstrate:

- multi-agent chat
- retrieval-assisted teaching
- image OCR and vision analysis
- voice transcription
- multilingual routing
- personalization
- durable lightweight memory
- SSE streaming responses

Not fully mature or production-hardened yet:

- file authorization
- full security hardening
- advanced long-term memory
- true live camera streaming
- strong production governance and compliance controls

## 13. Suggested Use of This Document

This file can be used as:

- project documentation
- internal architecture reference
- viva or presentation support material
- base material for a system design or SRS document

If needed, this can be expanded further into separate documents for:

- API documentation
- database schema documentation
- security hardening guide
- testing and QA plan
- admin or operations manual
