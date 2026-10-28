# Social Media Manager

Multi-client content agent for Facebook Pages, Instagram, blogs (git/webhook), HeyGen video, and DataForSEO keywords.

## Stack

- **API:** NestJS + MongoDB + JWT
- **Web:** Vite + React (polished agency UI)
- **Publish:** Meta Graph (Page token), GitHub git adapter, webhook adapter

## Quick start

```powershell
cd D:\socialmediamanager
copy .env.example .env
npm install
npm run seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4100/api/health

### Seed logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@socialmediamanager.app` | `Admin@12345` |
| Ecom Risers (client) | `client@ecomrisers.com` | `Ecom@12345` |

## Windows Server

Run Node as a Windows service or IIS HttpPlatformHandler pointing at `apps/api` production build. MongoDB on the same host or Atlas. Set `MONGO_URI` and `DRY_RUN_PUBLISH=false` when Meta tokens are live.

## Flow

1. Admin sets HeyGen + DataForSEO keys (Settings).
2. Client connects FB Page ID + long-lived Page token (+ IG user id).
3. Create a campaign with a topic → generate keywords/blog/captions/video brief.
4. Approve (or enable auto-publish) → post to Meta + publish blog via git and/or webhook.
