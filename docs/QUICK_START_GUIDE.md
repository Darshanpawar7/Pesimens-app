## Environment Variables
The frontend relies on several environment variables defined in `frontend/.env`.

### Required Variables
| Variable                 | Description                                                      | Example                            |
|---------                 |-------------                                                     |---------|
| `VITE_SUPABASE_URL`      | Supabase project URL used for authentication and database access | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous API key                                | `your-anon-key`                    |

### Setup Steps
1. Copy the example environment file:
```bash
cp frontend/.env.example frontend/.env
```
2. Replace placeholder values with your actual credentials.

3. Restart the development server:
```bash
npm run dev
```
---

## Using Mocked Data
Some features depend on backend APIs or third-party services such as Supabase and OneSignal.

If these services are not configured, parts of the application may not function fully. Contributors can still explore the UI using mocked or fallback data.

### What Still Works Without Backend Services
- Landing page
- Navigation and routing
- Static pages
- UI components
- Games interface

### What May Be Disabled
- Authentication
- Real-time notifications
- Database-backed content
- Personalized dashboards

### Expected Behavior
When backend services are unavailable, some sections may:

- Show placeholder content
- Display loading states
- Show error messages
- Redirect to public pages
This is expected during local development.

---

## Troubleshooting

### Blank White Page on Startup

**Cause:** Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.

**Example Error:**
```text
Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY
```

**Solution:**

1. Create `frontend/.env`.
2. Add the required variables.
3. Restart the development server.

---

### Build Fails with Missing Node Types
**Errors may include:**

- Cannot find module `fs`
- Cannot find module `path`
- Cannot find name `process`

**Solution:**
```bash
npm install --save-dev @types/node
```
---

### Dependency Warnings During Installation
Warnings about deprecated packages or vulnerabilities may appear during `npm install`.

These warnings usually do not prevent the application from running.

---

### Port Already in Use
If Vite reports that the default port is already in use, stop the conflicting process or allow Vite to use a different port.

---

### OneSignal Not Configured
If `VITE_ONESIGNAL_APP_ID` is not set, push notifications will be disabled, but the rest of the application will continue to function normally.

---

## Expected Development Workflow
1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Install dependencies.
4. Run the frontend.
5. Explore the application using available mocked or fallback data.