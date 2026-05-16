# Frontend Quick Start Guide

This public repository contains the frontend UI and documentation. Core backend services are private, so some features may require mocked data or the live API.

## Prerequisites

- Node.js 18+
- npm 9+

## Install and run

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## Environment setup

Copy the example file and set placeholder values as needed:

```bash
cp .env.example .env
```

For backend-dependent features, request access to the private repo or use the live API if available.

## Troubleshooting

- If pages look empty, check the browser console for missing API responses.
- If you see CORS or network errors, the backend is not available locally.

## Need help?

Use the issue tracker in this repo or see [SUPPORT.md](../SUPPORT.md).
