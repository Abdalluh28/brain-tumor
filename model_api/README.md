# Brain Tumor Model API

FastAPI service used by the Express backend to run model inference and save the
scan result in MongoDB.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn model_api.main:app --reload --host 127.0.0.1 --port 8000
```

Run these commands from the repository root.

## Environment

The service reads `MONGO_URL` from `.env` or `server/.env`. Optional values:

- `MONGO_DB`: database name when the Mongo URL does not include one. Defaults to `test`.
- `MODEL_VERSION`: version string saved on each scan. Defaults to `local-placeholder-v1`.

The Express server calls:

```text
MODEL_API_URL=http://127.0.0.1:8000/scans/analyze
```

The current `model_runner.py` is a deterministic placeholder. Replace
`run_model()` with the real model preprocessing and prediction pipeline while
keeping the returned fields the same.
