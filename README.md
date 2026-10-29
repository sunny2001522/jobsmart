# JobSmart Copilot

JobSmart Copilot is an agentic career navigator for people who want less repetitive job-search work and better feedback at each decision point.

It can scout for promising opportunities, tailor a truthful resume for a specific job description, and turn an interview recording into a concrete practice plan. The user stays in control: the agent proposes actions and evidence, but never submits an application without approval.

## Hackathon angle

The product is designed for the **Personal AI / Apps & Agentic AI** direction:

- persistent career context containing skills, constraints, preferences and prior interview feedback;
- an agent loop of retrieve → reason → reflect → propose;
- a server-only adapter for Nebius Token Factory and an NVIDIA Nemotron model;
- deterministic fallback data so judges can test the working web demo without credentials;
- existing integrations for JD parsing, resume versions, interview transcription/evaluation, Gmail and Turso.

The first demo screen is [`/copilot`](http://localhost:3004/copilot). It is intentionally a small, complete product loop rather than a collection of isolated AI buttons.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3004`. Nebius credentials are optional for the public preview. To enable live inference, set `NEBIUS_API_KEY` in `.env.local`; the key is only read by the server route and must never be prefixed with `NEXT_PUBLIC_`. Turso is the new persistence layer for career-agent data and Agent run history; see [`docs/NEBIUS_DEPLOY.md`](docs/NEBIUS_DEPLOY.md) for deployment.

```env
NEBIUS_API_KEY=...
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_MODEL=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B
```

## Demo script (90 seconds)

1. Open the Copilot workbench and show the personal context, guardrails and recommended jobs.
2. Click **替我排今天的行動** to show an agent-generated plan.
3. Click **客製履歷** on a recommended job to show the tailored-resume flow.
4. Open **面試準備** to record or paste an answer, then show the feedback loop.
5. In the code, point to `src/lib/ai/nebius.ts` and explain that the same server route switches from the deterministic preview to Token Factory when configured.

## Architecture

```text
Browser (/copilot)
        │ POST /api/agent/run
        ▼
Agent route (server-only)
        ├─ Nebius Token Factory + NVIDIA Nemotron
        └─ deterministic fallback for judge-friendly demo
        │
        ├─ job scout / JD crawler
        ├─ resume versions + customization
        └─ interview transcription + evaluation
```

## Validation

`npm run build` passes. `npm run lint` currently reports pre-existing issues in older routes/components; the new Copilot and Nebius files introduce no TypeScript build errors.

## Submission reminders

The supplied rules require a working URL, public source repository, demonstration video, English submission materials/translation, and a runtime call to Nebius Token Factory or deployment on Nebius AI Cloud. Before submitting, deploy the server route with a real Nebius credential, record the working flow, and add the public URLs to the submission form.
