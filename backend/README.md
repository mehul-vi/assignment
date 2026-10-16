# Backend setup

See the repository root `README.md` for the full setup and Docker instructions.

Quick start (Windows PowerShell):

```powershell
Copy-Item .env.example .env
# Edit .env and provide API, Qdrant, and SMTP credentials.
npm install
npm run dev
```

On startup, the server initializes Qdrant and ingests `data/employee_handbook.pdf`. Gemini embeddings are used for semantic retrieval; Qdrant stores vectors and page metadata. A chat model key (`GROQ_API_KEY` or `GEMINI_API_KEY`) is recommended for generated answers.

Email sign-in and booking confirmations require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Email codes and bearer sessions are stored in memory and expire; restarting the backend clears active sessions and codes.

Manual `POST /api/ingest` is disabled unless `INGEST_API_KEY` is configured. Send it in the `x-ingest-key` request header. Automatic startup ingestion does not require this key.

Never share or commit `.env`.
