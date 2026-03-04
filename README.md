# nodebb-plugin-api-routes

NodeBB plugin: Bearer-auth API routes without CSRF.

## Why

Standard NodeBB routes (`/api/post/upload` etc.) require a CSRF token tied to a browser session.
Master Token sets `req.uid` but does NOT create a session, so `csrf-sync` always returns 403.

This plugin registers routes under `/api/v3/plugins/api-routes/` that use only a Bearer token — no CSRF needed.

## Works with

- [nodebb-plugin-upload-api](https://github.com/KirillJsx/nodebb-plugin-upload-api) — WebP conversion + subfolder organization

  Both plugins must be active. The `filter:uploadStored` hook from `upload-api` fires automatically inside `uploadsController.uploadPost` regardless of which route called it.

## Install

```bash
cd /path/to/nodebb/node_modules
git clone https://github.com/KirillJsx/nodebb-plugin-api-routes
cd /path/to/nodebb
./nodebb restart
```

Then activate in ACP → Plugins → NodeBB API Routes.

## Routes

### POST `/api/v3/plugins/api-routes/upload`

Upload images/files via Bearer token without CSRF.

**Headers:**
```
Authorization: Bearer <master_token_or_user_token>
Content-Type: multipart/form-data
```

**Body:**
```
files[] = <file>
```

**Example (curl):**
```bash
curl -X POST https://forum.example.com/api/v3/plugins/api-routes/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files[]=@image.png"
```

**Response:**
```json
[{ "url": "/assets/uploads/files/a1/b2/image.webp" }]
```

## Middleware chain

```
authenticateRequest  →  Bearer token → req.uid
requireAuth          →  401 JSON if uid=0 (no redirect)
multer               →  parse multipart/form-data
validateFiles        →  check file types and sizes
uploads.ratelimit    →  NodeBB rate limiting
                        (no applyCSRF — intentional)
        ↓
uploadsController.uploadPost
        ↓
filter:uploadStored  →  WebP conversion + subfolders (via nodebb-plugin-upload-api)
```

## Adding new routes

Open `library.js` and add inside the `init` function:

```javascript
// Example: create post via API
router.post(
  '/api/v3/plugins/api-routes/posts',
  [middleware.authenticateRequest, requireAuth],
  async (req, res) => {
    // your logic here
  }
);
```

## License

MIT
