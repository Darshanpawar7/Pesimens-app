# 🚀 Beginner Tasks - PESIMENS App

Welcome to PESIMENS! This guide helps first-time contributors find easy tasks to get started.

---

 fix/mobile-nav-campus-mentors-79
## How to start
=======
## UI and Landing Page

### Task 1: Improve Landing Page Responsiveness
- **File:** `frontend/src/pages/LandingPage.tsx`
- **What to do:** Add `sm:`, `md:`, `lg:` Tailwind breakpoint classes to ensure the layout looks good on mobile, tablet, and desktop.
- **Acceptance Criteria:**
  - No horizontal scrolling on mobile (< 640px)
  - Hero section stacks vertically on mobile
  - PR includes before/after screenshots

### Task 2: UI Polish — Spacing and Typography
- **File:** `frontend/src/pages/LandingPage.tsx`, `frontend/src/index.css`
- **What to do:** Improve spacing, font sizes, and line heights for better readability.
- **Acceptance Criteria:**
  - Consistent padding/margin using Tailwind spacing scale
  - Typography is readable on all screen sizes
  - No visual regressions on desktop

### Task 3: Create Reusable UI Components
- **File:** `frontend/src/components/common/`
- **What to do:** Extract repeated UI patterns into reusable components such as `Spinner`, `Badge`, `EmptyState`, or `ConfirmModal`.
- **Acceptance Criteria:**
  - Component is placed in `frontend/src/components/common/`
  - Component accepts props with TypeScript interfaces
  - Component is used in at least one existing page

### Task 4: Accessibility Fixes
- **File:** `frontend/src/components/` (any component)
- **What to do:** Add missing `aria-label`, `alt` text on images, and ensure keyboard navigation works.
- **Acceptance Criteria:**
  - All interactive elements have accessible labels
  - Images have descriptive `alt` text
  - No accessibility warnings in browser DevTools

---
 dev

1. Pick a small task and open an issue describing it.
2. Wait for confirmation before starting work.
3. Submit a focused PR with screenshots for UI changes.

 fix/mobile-nav-campus-mentors-79
---

## 📋 Task Categories

| Category | Difficulty | Estimated Time |
|----------|------------|----------------|
| 🎨 UI/UX | Easy | 30 min - 1 hour |
| 📝 Documentation | Easy | 15 - 30 min |
| 🐛 Bug Fixes | Medium | 1 - 2 hours |
| ⚡ Performance | Medium | 1 - 2 hours |

---

## 🎨 UI/UX Tasks

### 1. Improve Landing Page Spacing

**File:** `src/pages/LandingPage.tsx` (Lines 40-80)

**Current Issue:** Spacing between sections is inconsistent.

**Acceptance Criteria:**
- [ ] Consistent padding (px-8 or py-12) across all sections
- [ ] Mobile responsive spacing
- [ ] No horizontal overflow on small screens

**How to Find:**
```bash
# Open the file
code src/pages/LandingPage.tsx
# Look for className="..." and adjust spacing

### Task 5: Fix Typos and Improve Clarity
- **File:** `docs/`, `README.md`, `CONTRIBUTING.md`
- **What to do:** Fix spelling mistakes, improve sentence clarity, and add missing punctuation.
- **Acceptance Criteria:**
  - No spelling errors in modified files
  - Sentences are clear and concise

### Task 6: Expand Onboarding Steps
- **File:** `CONTRIBUTING.md`
- **What to do:** Add more detailed steps for first-time contributors — how to set up the project locally, run the dev server, and submit a PR.
- **Acceptance Criteria:**
  - Step-by-step setup instructions are clear
  - Includes commands to run frontend and backend locally
  - New contributors can follow without prior context

---

## Developer Experience

### Task 7: Improve README Sections
- **File:** `README.md`
- **What to do:** Add missing sections such as Tech Stack, Project Structure, or Screenshots.
- **Acceptance Criteria:**
  - README has a clear project description
  - Tech stack is listed with versions
  - At least one screenshot or demo link is included

### Task 8: Add or Improve Linting Docs
- **File:** `CONTRIBUTING.md`, `README.md`
- **What to do:** Document how to run the linter and formatter before submitting a PR.
- **Acceptance Criteria:**
  - Commands like `npm run lint` and `npm run format` are documented
  - Contributors know what checks must pass before opening a PR

---

## How to Start

1. Pick a task from the list above and open an issue describing what you plan to do.
2. Wait for a maintainer to confirm and assign the issue to you.
3. Fork the repo and create a branch: `git checkout -b docs/your-task-name`
4. Make your changes and submit a focused PR.
5. For UI changes, include **before/after screenshots** in your PR description.

> **Tip:** Keep PRs small and focused — one task per PR works best!
 dev
