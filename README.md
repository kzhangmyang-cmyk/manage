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

Then choose one provider config in `.env.local`.

3. Start dev server

```bash
npm run dev
```

4. Open the `Local:` URL shown in the terminal. If `3000` is occupied, Next.js will auto-switch to another port.

## Provider configuration

### OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

### MiniMax

```env
AI_PROVIDER=minimax
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_MODEL=MiniMax-M2.5
```

Default MiniMax endpoint used by the demo:

```env
MINIMAX_BASE_URL=https://api.minimaxi.com
MINIMAX_API_PATH=/v1/text/chatcompletion_v2
```

### Other OpenAI-compatible providers

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=your_api_key_here
AI_MODEL=your_model_name
AI_BASE_URL=https://your-provider.example/v1
AI_API_PATH=/chat/completions
```

Notes:

- `openai-compatible` is for providers that expose an OpenAI-style chat completion API
- the demo will first try `response_format: json_object`; if the provider does not support it, it will automatically retry without that field
- MiniMax uses its own official endpoint and still returns the same parsed JSON structure to the frontend

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
