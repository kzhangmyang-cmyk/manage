# manage demo

Single-page demo for `manage`, an AI operations layer for enterprise managers.

## What this demo shows

- Natural-language issue intake for internal problems
- One real AI parsing step via `POST /api/analyze`
- A flow timeline showing assignment, SLA watching, and escalation
- A manager dashboard focused on risk, backlog, and summary

## Tech stack

- Next.js App Router
- React + TypeScript
- Tailwind-ready setup with custom CSS tokens
- Local mock data plus one real AI call

## Local run

1. Install dependencies

```bash
npm install
```

2. Copy env file and fill your key

```bash
copy .env.example .env.local
```

Then set `OPENAI_API_KEY` in `.env.local`.

3. Start dev server

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Required env vars

- `OPENAI_API_KEY`: required for the real AI parsing step
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`
- `OPENAI_BASE_URL`: optional, for compatible proxies

## Demo flow

1. Pick an industry version from the top bar
2. Use an example issue or type your own problem
3. Click `继续到 AI 解析`
4. Review AI parsing and Agent Activity
5. Open the timeline and manager dashboard

## Quick presenter tip

- For a fast live walkthrough, use the `直接演示` action in the example issue list.

## Build check

```bash
npm run build
```
