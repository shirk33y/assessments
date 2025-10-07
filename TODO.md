# Project TODOs

## Foundational Setup
- [x] Initialize Vite project with React 19 + TypeScript + SWC
- [x] Install dependencies (`npm install`)
- [x] Run dev server and verify app boots (`npm run dev`)
- [x] Verify Node version compatible (>= 22.12 or ^20.19)
- [x] Pin latest package versions (React, Vite, Tailwind, Supabase, TS, ESLint, Prettier)
- [x] Add basic `App.tsx` and `main.tsx`
- [x] Add `index.html`

- [x] Integrate Tailwind CSS v4 via `@tailwindcss/vite` plugin (no PostCSS config required)
  - [x] Add `@tailwindcss/vite` to `vite.config.ts`
  - [x] Create `src/index.css` with `@import "tailwindcss";`
  - [x] Verify Tailwind classes load on first dev run

- [x] Integrate Supabase client SDK and environment configuration
  - [x] Add `@supabase/supabase-js` to dependencies (pinned)
  - [x] Create `src/lib/supabaseClient.ts`
  - [x] Add `env.local.example`
  - [x] Create `.env.local` with Supabase URL and anon key
  - [x] Verify session retrieval in `App.tsx`

- [ ] Set up project tooling (ESLint, Prettier, TypeScript strict mode)
   - [x] Add `eslint.config.mjs`
   - [x] Add `.prettierrc.json`
   - [x] Enable TS strict mode in `tsconfig.json`

## Supabase Configuration
- [ ] Create Supabase project and service role setup
- [ ] Define database schema for users, roles, competencies, evaluations, and feedback entries
- [ ] Configure Row Level Security (RLS) policies for each table
- [ ] Set up Supabase Auth providers and email templates
- [ ] Establish storage buckets for report exports (PDF/CSV)
- [x] Apply initial SQL from `docs/SUPABASE_SETUP.md` via SQL Editor
- [ ] Enable Google provider (OAuth) and verify sign-in flow end-to-end
- [ ] Confirm `public.profiles` trigger creates rows on new OAuth sign-ins
- [x] Design schema for assessment templates, questions, options, invitations, responses
- [x] Add Supabase policies to protect assessment data (template ownership, invitation access)
- [x] Prepare SQL scripts for assessment-specific tables in `docs/SUPABASE_SETUP.md`

## Authentication & Authorization
- [ ] Implement email/password fallback (optional)
- [x] Implement Google OAuth sign-in/out UI
- [ ] Create role-based access control (RBAC) aligned with HR Administrators, Managers, Employees
- [ ] Build protected route guards and session persistence
- [ ] Generate invitation tokens (per recipient) and verify access control

## Routing & Layout
- [ ] Add `react-router-dom` with app shell layout
  - [ ] Create `ProtectedRoute` component leveraging Supabase session
  - [ ] Add routes for dashboard, competencies, cycles, evaluations, reports, assessments
- [ ] Build dashboard layout showing current user info and quick links
- [ ] Create assessment workspace (templates list, create/edit, invitations)
- [ ] Create assessment player route for invite tokens (mobile-first)

## Evaluation Cycle Management
- [ ] Create UI to launch periodic evaluation cycles (quarterly, annual)
- [ ] Implement participant selection workflows per cycle
- [ ] Design forms for competency ratings using defined scales
- [ ] Add qualitative feedback capture (open-ended questions)
- [ ] Support evaluator relationship types (Self, Manager, Direct report, Peer)

## Competency Management
- [ ] Build CRUD interface for competency definitions and descriptions
- [ ] Assign required competency levels to positions/job roles
- [ ] Manage linkage between positions and evaluation templates

## Reporting & Analytics
- [ ] Generate individual evaluation reports with ratings and feedback summaries
- [ ] Produce aggregate reports with filtering by department, team, role
- [ ] Implement interactive heat maps visualizing competency distribution
- [ ] Detect and highlight competency gaps vs role requirements
- [ ] Export reports to PDF/CSV and prepare for sharing
- [ ] Scaffold Supabase Edge Function for report exports and future scheduling

## Assessments
- [ ] Assessment template builder
  - [ ] Support question types: single choice, multi choice, numeric scales (configurable 1–N)
  - [ ] Allow per-question descriptions, score weight, and scale variant (number/hearts/stars etc.)
  - [ ] Allow value-level descriptions for numeric scales
- [ ] Invitation management
  - [ ] Generate unique, secure link per invited participant
  - [ ] Track invitation status (pending, sent, completed)
- [ ] Assessment player
  - [ ] One question/answer displayed at a time
  - [ ] Responsive/mobile-first design
  - [ ] Persist responses and allow resume per invite
  - [ ] Guard routes using invitation token

## User Experience & Design
- [ ] Create responsive dashboard layout for each user group
- [ ] Implement notification system for evaluation reminders and completions
- [ ] Provide accessibility features (WCAG compliance) and internationalization groundwork

## Quality Assurance
- [ ] Write unit tests for core logic and hooks
- [ ] Add integration tests for Supabase interactions
- [ ] Configure end-to-end tests covering main user flows (Cypress/Playwright)
- [ ] Set up continuous integration pipeline (GitHub Actions)

## Documentation
- [ ] Document Supabase schema and policies
- [ ] Provide user guide for HR administrators, managers, employees
- [ ] Maintain changelog and contribution guidelines
 - [x] Supabase console setup guide created and linked from README (`docs/SUPABASE_SETUP.md`)
