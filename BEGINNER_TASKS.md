# 🚀 Beginner Tasks - PESIMENS App

Welcome to PESIMENS! This guide helps first-time contributors find easy tasks to get started.

---

## How to start

1. Pick a small task and open an issue describing it.
2. Wait for confirmation before starting work.
3. Submit a focused PR with screenshots for UI changes.

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