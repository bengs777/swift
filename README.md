# Swift

Swift is a Next.js 16 app ready to deploy on Vercel with the custom domain `swift.jbb.my.id`.

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Add the custom domain `swift.jbb.my.id` in Vercel.
4. Set the production environment variables below.
5. Redeploy after the variables are saved.

## Required Environment Variables

Use these values in the Vercel project settings:

| Variable | Example value |
|---|---|
| `NEXTAUTH_URL` | `https://swift.jbb.my.id` |
| `NEXTAUTH_SECRET` | secure random string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `TURSO_DATABASE_URL` | `libsql://...` |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXT_PUBLIC_APP_URL` | `https://swift.jbb.my.id` |
| `DEV_OWNER_EMAIL` | `ibnualmugni1933@gmail.com` |
| `AI_PRIMARY_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | OpenRouter API key |
| `OPENAI_API_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_DEFAULT_MODEL` | `qwen/qwen3-coder:free` |
| `OPENAI_MODELS` | `qwen/qwen3-coder:free,tencent/hy3-preview:free,qwen/qwen3.6-plus-preview:free` |
| `OPENAI_FALLBACK_MODEL` | `qwen/qwen3-coder:free` |

## Google OAuth Redirect URI

Add this exact redirect URI in Google Cloud Console:

`https://swift.jbb.my.id/api/auth/callback/google`

## Build

The project already uses `npm run build` which runs the Vercel build helper in `scripts/vercel-build.js`.

## Notes

- Keep `.env` out of Git. Use `.env.example` as the template.
- `GOOGLE_AUTH_SETUP.md` contains the step-by-step production auth checklist.
- OpenRouter free models are pinned in the runtime model list so the app stays on the free-only path by default.
