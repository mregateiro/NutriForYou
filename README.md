# NutriForYou

All-in-one SaaS platform for nutritionists. Manage patients, consultations, meal plans, and more.

## Project Structure

The Next.js application lives in the `nutrifor-you/` subdirectory.

## Deploying to Vercel

### Recommended: Set Root Directory

1. Go to your [Vercel project dashboard](https://vercel.com)
2. Navigate to **Settings → General → Root Directory**
3. Set it to `nutrifor-you`
4. Redeploy

This ensures Vercel's full Next.js integration (serverless functions, API routes, ISR, etc.) works correctly.

### Environment Variables

Make sure to configure the required environment variables in Vercel's project settings. See `nutrifor-you/.env.example` for the list of required variables.