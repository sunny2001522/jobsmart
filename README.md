# JobSmart Copilot

JobSmart Copilot is an AI-powered career navigator for people who want to spend less time on repetitive job-search work and more time making confident decisions.

It brings job discovery, resume tailoring, interview practice, and career reflection into one focused workspace. The assistant proposes actions and explains its reasoning, while the user remains in control of every external action.

## What it does

- **Job discovery:** Search public job sources using role, skill, location, and experience keywords. New results become reviewable job leads instead of being submitted automatically.
- **Application tracking:** Manage saved jobs, preparation, applications, interviews, and offers on a Kanban-style board.
- **Truthful resume tailoring:** Create job-specific resume drafts from an existing resume without inventing experience or credentials.
- **Interview practice:** Answer questions with plain text, receive AI feedback, and keep a history of strengths and improvement areas.
- **Company context:** Collect company reviews and interview signals to support better decisions.
- **Career values:** Rank work values and use the result as persistent context for recommendations.
- **Copilot workflow:** Turn a personal career profile into a sequence of reviewable next actions.

The main product loop is available at [`/copilot`](http://localhost:3004/copilot) when the app is running locally.

## Project category

JobSmart fits two product categories:

- **Best Apps and Agents:** A practical career copilot that combines job discovery, resume workflows, interview feedback, and human-approved actions.
- **Personal AI:** A private, persistent assistant that uses the user's skills, constraints, preferences, and practice history as reusable career context.

## Why it is useful

Job searching is a chain of small decisions: which roles deserve attention, how a resume should be adapted, what to practice before an interview, and when an opportunity is worth pursuing. JobSmart keeps those decisions connected so that the user can move from discovery to action without losing context.

The system is deliberately approval-based. It can analyze, draft, score, and recommend, but it does not submit an application on the user's behalf without explicit confirmation.

## AI and infrastructure

The server-side AI gateway supports Nebius Token Factory and NVIDIA open source models. The default configured model is NVIDIA Nemotron 3 Nano through Nebius Token Factory:

```text
nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B
```

The integration is implemented in [`src/lib/ai/provider.ts`](src/lib/ai/provider.ts) and [`src/lib/ai/nebius.ts`](src/lib/ai/nebius.ts). API credentials are read only by server routes and are never exposed through client-side environment variables.

When no Nebius credential is available, the public preview uses deterministic fallback responses. This keeps the interface testable while preserving the same product flow used for live inference.

The application also supports Nebius-hosted transcription for interview recordings when configured. The Question bank accepts plain-text answers directly, so the core interview workflow does not require microphone permissions.

### Request flow

```text
Browser
  │
  ├── job discovery, resume, interview, and career context
  │
  ▼
Next.js server routes
  │
  ├── Nebius Token Factory + NVIDIA Nemotron
  ├── deterministic preview fallback
  └── Turso persistence and agent-run history
```

## Technology stack

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS and Radix UI primitives
- Turso / LibSQL for application and agent history data
- Nebius Token Factory for server-side model inference
- NVIDIA Nemotron for career-agent reasoning and text generation
- Vercel-compatible deployment configuration

## Run locally

### Prerequisites

- Node.js 20 or newer
- npm
- A Turso database for persistent data, or the project's configured local preview data source

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

### Optional environment variables

Create `.env.local` and add the server-side credentials you want to use:

```env
NEBIUS_API_KEY=your_server_side_key
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_MODEL=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B

# Optional persistence configuration
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_token
```

Never prefix private credentials with `NEXT_PUBLIC_`. The Nebius key is consumed only by server routes.

Nebius configuration details are documented in [`docs/NEBIUS_DEPLOY.md`](docs/NEBIUS_DEPLOY.md).

## Product walkthrough

1. Open the Copilot workspace and review the personal career context.
2. Use **Find opportunities** to inspect recommended roles and evidence.
3. Open the application board to save a role or add one manually.
4. Select a resume version and generate a job-specific draft.
5. Review the draft and cover letter before approving any next step.
6. Open the Question bank, expand a question, and enter a plain-text answer directly on the page.
7. Request AI feedback and use the saved strengths and improvement areas for the next practice session.

## AI implementation notes

- [`src/app/api/agent/run/route.ts`](src/app/api/agent/run/route.ts) exposes the server-only Copilot action endpoint.
- [`src/lib/ai/nebius.ts`](src/lib/ai/nebius.ts) maps Copilot actions to structured model responses and deterministic fallback data.
- [`src/lib/ai/gateway.ts`](src/lib/ai/gateway.ts) contains shared generation, resume, interview, and job-description flows.
- [`src/lib/turso/server.ts`](src/lib/turso/server.ts) records model provider, model name, request context, and response data for agent-run history.
- Sensitive actions remain behind explicit user approval in the UI.

## Deployment

The application can be deployed to Vercel or to Nebius AI Cloud infrastructure that can run a Next.js service.

For a production deployment:

1. Configure the server-side Nebius and Turso environment variables.
2. Set `CRON_SECRET` if background job discovery is enabled.
3. Confirm that the deployed server can reach Nebius Token Factory.
4. Verify the Copilot, resume, interview, and application-tracking flows.
5. Keep credentials out of the repository and out of client bundles.

The deployment checklist is available at [`docs/NEBIUS_DEPLOY.md`](docs/NEBIUS_DEPLOY.md).

## Public demo and media

- **Local demo:** [http://localhost:3004](http://localhost:3004)
- **Hosted demo:** Add the deployed application URL here.
- **Demo video:** Add a public video URL here showing the Copilot flow, Nebius Token Factory configuration, and NVIDIA Nemotron-powered output.
- **Source repository:** This repository is the public source of the application.

The demo should show a complete working path rather than isolated model calls: career context → opportunity recommendation → tailored resume → interview answer → actionable feedback.

## Release checklist

Before publishing a hosted build, confirm that:

- The deployed application is reachable and the main product flow works.
- At least one NVIDIA open source model is used through Nebius Token Factory or Nebius AI Cloud.
- The README includes setup instructions and clear run guidance.
- The public repository includes an open source license.
- The demo video is public and no longer than three minutes.
- The video shows how the application uses Nebius and NVIDIA technologies.
- Any pre-existing functionality is clearly separated from newly changed functionality in the release notes.

## License

This project is licensed under the [MIT License](LICENSE).
