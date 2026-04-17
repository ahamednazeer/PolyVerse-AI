"""RAG Retriever — Qdrant vector store with sentence-transformers."""
import os
import uuid

from app.config import settings


class RAGRetriever:
    """Qdrant-based retrieval for Teaching Agent."""

    def __init__(self):
        self._client = None
        self._embedder = None
        self._ready = False

    def is_ready(self) -> bool:
        return self._ready

    async def initialize(self):
        """Initialize Qdrant client and collection."""
        try:
            from sentence_transformers import SentenceTransformer
            from qdrant_client import QdrantClient
            from qdrant_client.http import models

            self._embedder = SentenceTransformer(settings.EMBEDDING_MODEL)

            if settings.QDRANT_URL:
                self._client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            else:
                os.makedirs("./data/qdrant", exist_ok=True)
                self._client = QdrantClient(path="./data/qdrant")

            # Check collection
            dim = self._embedder.get_sentence_embedding_dimension()
            collection_name = settings.QDRANT_COLLECTION

            collections = self._client.get_collections().collections
            if not any(c.name == collection_name for c in collections):
                self._client.create_collection(
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(
                        size=dim,
                        distance=models.Distance.COSINE
                    )
                )
                print(f"📝 Created Qdrant collection: {collection_name}")
            else:
                info = self._client.get_collection(collection_name)
                print(f"✅ Qdrant collection loaded: {info.points_count} vectors")
            
            self._ready = True

        except ImportError as e:
            print(f"⚠️ RAG dependencies not installed: {e}")
        except Exception as e:
            print(f"⚠️ RAG initialization error: {e}")

    async def add_documents(self, documents: list[dict]):
        """Add documents to the index. Each doc: {content, source, metadata}."""
        if not self._embedder or not self._client:
            return

        from qdrant_client.http import models

        texts = [doc["content"] for doc in documents]
        embeddings = self._embedder.encode(texts, normalize_embeddings=True)

        points = []
        for i, embedding in enumerate(embeddings):
            doc = documents[i]
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding.tolist(),
                    payload=doc
                )
            )

        self._client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        print(f"📚 Added {len(documents)} documents to Qdrant.")

    async def search(
        self,
        query: str,
        top_k: int = 3,
        file_ids: list[str] | None = None,
        user_id: str | None = None,
    ) -> list[dict]:
        """Search for relevant documents."""
        if not self._embedder or not self._client:
            return []

        from qdrant_client.http import models

        query_embedding = self._embedder.encode([query], normalize_embeddings=True)[0]
        must_conditions = []

        if file_ids:
            must_conditions.append(
                models.FieldCondition(
                    key="metadata.file_id",
                    match=models.MatchAny(any=file_ids),
                )
            )
        if user_id:
            must_conditions.append(
                models.FieldCondition(
                    key="metadata.user_id",
                    match=models.MatchValue(value=user_id),
                )
            )

        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        hits = self._client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=query_embedding.tolist(),
            limit=top_k,
            score_threshold=0.3,
            query_filter=query_filter,
        )

        results = []
        for hit in hits:
            doc = hit.payload.copy()
            doc["score"] = hit.score
            results.append(doc)

        return results

    async def ingest_file(
        self,
        filepath: str,
        chunk_size: int = 500,
        source: str | None = None,
        metadata: dict | None = None,
    ):
        """Ingest a file by chunking and adding to index."""
        if not self._embedder or not self._client:
            return

        ext = os.path.splitext(filepath)[1].lower()
        chunks = []
        base_metadata = metadata or {}

        def append_chunk(content: str, chunk_metadata: dict):
            if not content.strip():
                return
            chunks.append({
                "content": content.strip(),
                "source": source or os.path.basename(filepath),
                "metadata": {
                    **base_metadata,
                    **chunk_metadata,
                },
            })

        def chunk_words(text: str, extra_metadata: dict):
            words = text.split()
            for i in range(0, len(words), chunk_size):
                chunk_text = " ".join(words[i:i + chunk_size]).strip()
                if chunk_text:
                    append_chunk(
                        chunk_text,
                        {
                            "chunk_index": i // chunk_size,
                            **extra_metadata,
                        },
                    )

        try:
            if ext == ".pdf":
                from pypdf import PdfReader
                reader = PdfReader(filepath)
                global_chunk_index = 0
                for page_number, page in enumerate(reader.pages, 1):
                    page_text = (page.extract_text() or "").strip()
                    if not page_text:
                        continue
                    words = page_text.split()
                    for i in range(0, len(words), chunk_size):
                        chunk_text = " ".join(words[i:i + chunk_size]).strip()
                        if chunk_text:
                            append_chunk(
                                chunk_text,
                                {
                                    "page": page_number,
                                    "page_chunk_index": i // chunk_size,
                                    "chunk_index": global_chunk_index,
                                },
                            )
                            global_chunk_index += 1

            elif ext in (".doc", ".docx"):
                from docx import Document
                doc = Document(filepath)
                text = "\n".join(p.text for p in doc.paragraphs)
                chunk_words(text, {})

            elif ext in (".txt", ".md", ".py", ".js", ".ts", ".java", ".cpp", ".c"):
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                chunk_words(text, {})
            else:
                return

        except Exception as e:
            print(f"⚠️ Failed to parse {filepath}: {e}")
            return

        if not chunks:
            return

        if chunks:
            await self.add_documents(chunks)


# Singleton
retriever = RAGRetriever()
