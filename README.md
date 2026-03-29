# NutriForYou

All-in-one SaaS platform for nutritionists. Manage patients, consultations, meal plans, and more.

## Project Structure

The Next.js application lives in the `nutrifor-you/` subdirectory.

## Deploying to Vercel

Because the Next.js app is inside the `nutrifor-you/` subdirectory (not at the repo root), Vercel **must** be configured to use that subdirectory as its Root Directory. Without this, Vercel cannot find the Next.js project and all pages will return 404.

### Setup Steps

1. Import the repository in [Vercel](https://vercel.com/new)
2. **Before deploying**, go to **Settings → General → Root Directory**
3. Set Root Directory to **`nutrifor-you`**
4. Click **Deploy** (or **Redeploy** if you already deployed once)

> **Important:** Do NOT add a `vercel.json` at the repository root. The deployment
> configuration lives in `nutrifor-you/vercel.json` and is picked up automatically
> once the Root Directory is set correctly.

### Environment Variables

Make sure to configure the required environment variables in Vercel's project settings. See `nutrifor-you/.env.example` for the list of required variables.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on all pages | Root Directory not set to `nutrifor-you` | Set Root Directory in Vercel Settings → General |
| Build fails with "next: not found" | Root Directory not set | Same as above |
| Prisma errors during build | Missing `DATABASE_URL` env var | Add it in Vercel Settings → Environment Variables |