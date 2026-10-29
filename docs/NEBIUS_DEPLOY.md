# Nebius deployment checklist

The repository now produces a standalone Next.js container. The remaining
cloud-side steps require the owner's Nebius account and cannot be completed
without signing in to the Console.

## Environment variables

Configure these as server-side secrets in the Nebius deployment, never as
`NEXT_PUBLIC_*` values:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
NEBIUS_API_KEY
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_MODEL=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B
```

## Container

```bash
docker build -t jobsmart:latest .
docker run --rm -p 3000:3000 --env-file .env.local jobsmart:latest
```

Deploy the image using a Nebius AI Cloud VM or Serverless/Container endpoint,
then set its public URL as the Hackathon demo URL. Confirm `/copilot` and
`POST /api/agent/run` return successfully from the public host.

## Important

The current public-preview mode is deterministic when `NEBIUS_API_KEY` is
missing. Before submission, configure the real key and verify that the API
response reports `provider: nebius-token-factory`; otherwise the project has
not yet satisfied the rules' runtime-call requirement.
