# Social Media Manager

Multi-client content agent for Facebook Pages, Instagram, blogs (git/webhook), HeyGen or Google Flow video, and DataForSEO keywords.

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

1. Admin sets **Cursor API key** + schedule hours (default 9 & 21) in Settings.
2. Client connects Facebook Page + Instagram.
3. **Schedule a post** (topic + go-live time). Content is prepared ~2 days early (full pack per client campaign in one go). Review, swap image/video links, then **Approve for schedule** or **Post now**.
4. Twice-daily batch creates due drafts and posts approved items whose time has arrived. Manual **Run schedule check now** is on Home.

Get a Cursor key at [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations).
