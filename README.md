# TRACES — Message Threat Analysis

A responsive black-toned fraud-message analysis app for a college AIML project. Users can paste suspicious text or upload a screenshot. The backend extracts screenshot text with OCR, analyzes message signals, and returns a risk estimate with explanations and safety recommendations.

## Features

- Responsive dark interface for desktop, tablet, and mobile.
- Text input and drag-and-drop or browse-to-upload screenshot handling.
- OCR text extraction with Tesseract.js (English language data is downloaded on first OCR use).
- Server-side AI integration through the **Google Gemini API** (`generateContent`).
- API-key placeholder in `server/.env.example`; the secret stays on the backend.
- Demo heuristic mode when no API key is configured, so the app can still be explored.
- Findings, estimated risk score, explanations, next steps, OCR text, and recent scans (kept in the browser's local storage).
- Upload and text-length limits with basic file-type validation.

> **Important:** The risk percentage is an estimate, not proof that a message is fraudulent or safe. The default demo heuristic is only a prototype. For a serious classifier, train and evaluate a model with representative labelled data, and calibrate its scores. This tool does not verify sender identity, visit submitted links, check bank transactions, or establish whether a news claim is true.

## Requirements

- Node.js 20 or newer
- npm
- Internet access on the first OCR run to download Tesseract's English language data
- A Gemini API key for live AI analysis (optional while developing). Create one free at https://aistudio.google.com/apikey

## Run locally

From this project folder:

```bash
npm install
cp server/.env.example server/.env
```

On Windows PowerShell, use this to copy the environment example:

```powershell
Copy-Item server/.env.example server/.env
```

Open `server/.env` and edit these values:

```dotenv
GEMINI_API_KEY=paste_your_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=45000
PORT=8787
```

`GEMINI_MODEL` can be any Gemini model that supports `generateContent` (for example `gemini-3.5-flash-lite` for a cheaper, faster option). Model names change over time; see https://ai.google.dev/gemini-api/docs/models for the current list. If Gemini is busy (HTTP 503/429), the server retries and then tries `GEMINI_FALLBACK_MODEL` (set it to `off` to disable). If the key is missing or Gemini still can't be reached, the app falls back to demo mode and says so in the report.

Start both services:

```bash
npm run dev
```

Then open **http://localhost:5173**. The API health endpoint is **http://localhost:8787/api/health**.

Build the frontend for production:

```bash
npm run build
```

After `npm run build`, the server will also serve `client/dist` automatically when you run `npm start`, so a simple deployment can host the API and frontend together. Set environment variables through your host's secret/environment settings; do not commit `server/.env`.

## API endpoints

### `GET /api/health`
Returns status, whether an API key is configured, and the demo/AI mode. It never returns the API key.

### `POST /api/analyze`
Multipart form fields:

- `message`: optional text (up to 12,000 characters)
- `image`: optional single image (PNG, JPG, WEBP, BMP, or TIFF; up to 8 MB)

At least one input must contain readable text. Returns `mode`, `extractedText`, `analysis`, and a timestamp.

## Suggested next steps for the AIML report

1. Obtain a licensed, suitable labelled dataset of legitimate and fraudulent messages.
2. Split data into training, validation, and test sets without duplicates crossing splits.
3. Train a baseline model such as TF-IDF + Logistic Regression, then compare it with a pretrained language model.
4. Evaluate precision, recall, F1, false-positive rate, and calibration—not accuracy alone.
5. Document privacy controls, limitations, and the fact that fraud patterns and legitimate messages can overlap.
