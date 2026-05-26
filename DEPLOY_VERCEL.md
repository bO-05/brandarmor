# Deploy BrandArmor v4 To Vercel

## Prerequisites

- GitHub repo: `bO-05/brandarmor-v4-handoff`.
- Vercel account active.
- API keys ready: `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, and optionally `PERPLEXITY_API_KEY`.

## Step 1 - Import The Repo

1. Go to https://vercel.com/new.
2. Click **Import Git Repository**.
3. Import `bO-05/brandarmor-v4-handoff`.
4. Use these settings:

| Field | Value |
|---|---|
| Project Name | `brandarmor` or another stable demo name |
| Framework Preset | Next.js |
| Root Directory | `outputs/brandarmor-v4-handoff` for the current remote repo. Use `.` only if deploying the cleaned local app as its own repo. |
| Build Command | default (`next build`) |
| Output Directory | default |
| Install Command | default (`npm install`) |
| Node.js Version | 20.x or 22.x; must be `>=20.19` |

## Step 2 - Environment Variables

Add these to Production, Preview, and Development unless noted otherwise:

| Name | Value |
|---|---|
| `MISTRAL_API_KEY` | Mistral API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `PERPLEXITY_API_KEY` | Optional, for candidate discovery |
| `BRANDARMOR_OCR_PROVIDER` | `mistral` |
| `BRANDARMOR_OCR_MODEL` | `mistral-ocr-latest` |
| `BRANDARMOR_LLM_JUDGE_PROVIDER` | `anthropic` |
| `BRANDARMOR_LLM_JUDGE_MODEL` | `claude-sonnet-4-6` |
| `BRANDARMOR_LLM_JUDGE_FALLBACK_PROVIDER` | `mistral` |
| `BRANDARMOR_LLM_JUDGE_FALLBACK_MODEL` | `mistral-large-latest` |

Keep these unset in Vercel:

- `BRANDARMOR_DATA_DIR`: serverless runtime writes to `/tmp/.brandarmor-data`.
- `BPOM_DISABLE_API`: leave unset when you want live BPOM checks.

## Step 3 - Deploy

1. Click **Deploy**.
2. Wait for the build.
3. Open the deployment URL.

Expected:

- `/api/health` returns `{"status":"ok","app":"brandarmor-v4","version":"0.4.2"}`.
- `/api/health/demo-readiness` reports writable data and seeded demo readiness after seed/demo run.
- `/api/health/integrations` labels BPOM, Mistral OCR, Anthropic judge, Mistral fallback, and Perplexity as configured/implemented when env vars are present. Browser-Use and Hugging Face remain roadmap.

## Step 4 - Test The Demo

Open:

```text
https://your-app.vercel.app/demo
```

Click **Run Demo Pipeline**.

Expected result:

- OCR may use mock output for placeholder `example.com` screenshots; this is labeled in `signals.ocr`.
- BPOM uses the real `cekbpom.pom.go.id` adapter and is labeled in `signals.bpom`.
- Visual matching is still adapter/mock and labeled in `signals.visual`.
- Anthropic judge runs as a real structured-output tool call when `ANTHROPIC_API_KEY` is valid. If Anthropic is unavailable, Mistral judge fallback runs. If both fail, the demo labels mock fallback explicitly.
- Scoring returns transparent rule reasons, commonly `critical` for the seeded suspect scenario.

Confirm by opening `/listings/<id>` from the demo response. The regulatory section should show `provider: bpom_api` and BPOM lookup duration when the external endpoint is reachable.

## Troubleshooting

| Issue | Fix |
|---|---|
| Build fails with module/path errors | Confirm Root Directory matches the repo shape. Current remote repo needs `outputs/brandarmor-v4-handoff`; cleaned standalone repo uses `.`. |
| 500 with `.brandarmor-data` on Vercel | Deploy the current code and keep `BRANDARMOR_DATA_DIR` unset. Current serverless mode ignores unsafe relative data-dir overrides. |
| Anthropic key works in console but app uses another key | Check for a stale parent environment variable. Locally use `scripts/start-local.ps1`, which reads `.env.local` explicitly. |
| OCR stays mock in one-click demo | Expected for placeholder `example.com` screenshots. Use a publicly fetchable image URL through `/api/ocr` for real OCR. |
| BPOM lookup times out | Retry; public endpoints can be slow. For offline testing only, set `BPOM_DISABLE_API=1`. |
| Browser-Use or Hugging Face shown as roadmap | Correct for v0.4.2; env presence does not mean those integrations are implemented. |

## After Deployment

Record:

- Live app URL.
- `/api/health` response.
- `/api/health/integrations` response.
- One successful `/api/demo/run` response showing mock/real signals.
