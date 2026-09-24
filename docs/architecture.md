# NyayaSaathi — Architecture

## Mermaid Diagram

```mermaid
graph TB
    User["👤 User (Browser)\nEnglish / Hindi / Marathi"]

    subgraph Frontend["Next.js 14 App Router (Client)"]
        QAPage["Q&A Page\nVoice input + Read-aloud\nStreaming answer + Sources"]
        SimplifyPage["Simplify Page\nPaste text or upload .txt/.pdf"]
        DraftPage["Draft Page\nStep-by-step wizard\nPrint / Copy PDF"]
        LegalAidPage["Legal Aid Page\nNALSA + DLSA + Checklist"]
        Layout["Layout\nLang switch · Font size · High contrast"]
    end

    subgraph API["Next.js API Routes (Node.js)"]
        QARoute["POST /api/qa\n1. Zod validate\n2. Redact PII\n3. Check cache\n4. BM25 retrieve\n5. Confidence gate\n6. Stream LLM"]
        SimplifyRoute["POST /api/simplify\n1. Zod validate\n2. Injection guard\n3. Redact PII\n4. LLM → JSON"]
        DraftRoute["POST /api/draft\n1. Zod validate\n2. Template generate\n3. Optional LLM translate"]
    end

    subgraph Security["Security Layer (every request)"]
        RateLimit["Rate Limiter\nSliding window per IP\n20 req/min · 200/day"]
        Validator["Zod Schemas\nMax lengths · Unknown fields rejected"]
        Redactor["PII Redactor\nAadhaar · PAN · Phone · Email · UPI"]
        InjGuard["Injection Guard\n13 heuristic patterns\nDocument wrapped in data tags"]
    end

    subgraph RAG["Retrieval (in-memory)"]
        BM25["BM25 Index\nBuilt once at startup\ntokenize → IDF → score"]
        Corpus["corpus.json\n13 chunks\nRTI Act 2005\nConsumer Protection Act 2019\nTenancy (general)"]
        Threshold["Confidence Threshold\nScore ≥ 1.0 → call LLM\nScore < 1.0 → NALSA fallback"]
    end

    subgraph LLM["LLM Layer"]
        Provider["LLMProvider interface\nSwappable via env var"]
        Gemini["GeminiProvider\ngemini-2.0-flash\nContext-only system prompt\nStreaming via SDK"]
        Retry["Retry + Timeout\nExponential backoff 3x\n25s timeout"]
        Cache["LRU Cache\n100 entries · 5min TTL\nKeyed: language + normalized query"]
    end

    User --> Frontend
    Frontend --> API
    API --> Security
    Security --> QARoute
    Security --> SimplifyRoute
    Security --> DraftRoute
    QARoute --> RAG
    RAG --> Corpus
    BM25 --> Threshold
    Threshold -->|"confident"| LLM
    Threshold -->|"not confident"| User
    LLM --> Provider
    Provider --> Gemini
    Gemini --> Retry
    LLM --> Cache
    Cache -->|"cache hit"| User
    Gemini -->|"stream tokens"| User
```

## Data Flow — Q&A Request

```
Browser
  │ POST /api/qa { question, language }
  ▼
Rate Limiter (per-IP sliding window)
  │ allowed?
  ▼
Zod Validation (question ≤ 1000 chars, language ∈ {en,hi,mr})
  │ valid?
  ▼
PII Redactor (Aadhaar, PAN, phone, email, UPI → placeholders)
  │ clean query
  ▼
LRU Cache Lookup (normalized query + language)
  │ miss
  ▼
BM25 Index Search (top-4 chunks from 13-chunk corpus)
  │ best score
  ▼
Confidence Gate
  ├─ score < 1.0 → stream "I'm not sure + NALSA 15100" (NO LLM call)
  └─ score ≥ 1.0 → build context from top-k chunks
                      │
                      ▼
                   Gemini 2.0 Flash (system prompt: context-only, cite sources)
                      │ streaming tokens
                      ▼
                   Stream to browser (ReadableStream)
                   Sources encoded in X-Sources header (URL-encoded JSON)
                   Cache full response on completion
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| BM25 over vector DB | Zero infrastructure cost, no cold start, instant lookup, sufficient for small corpus |
| Confidence threshold before LLM | Prevents hallucination on out-of-corpus queries; saves API quota |
| PII redaction before LLM | Privacy-first; Aadhaar/PAN never leave the server unredacted |
| Deterministic templates | Drafts are always factually correct; LLM only translates/polishes |
| Injection guard + data tags | Documents are untrusted; prevent prompt injection from user content |
| In-memory rate limiter | Simple, zero-dependency; documented Redis upgrade path for production |
| LRU cache | Repeated common questions (RTI deadline, consumer rights) served instantly |
| Streaming responses | Better UX — user sees answer tokens as they arrive |
| No database | Corpus is static JSON; zero infra to manage or pay for |
