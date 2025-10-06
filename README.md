# Employee Performance Review System

## Objective
The system is designed to enable periodic employee performance reviews within the organization. It supports the development of competencies, identifies competency gaps, and provides reporting across multiple dimensions.

## Functional Scope

### 1. Employee Evaluations
- Launch cyclical review processes (e.g., quarterly, annually).
- Select the users who participate in each evaluation cycle.
- Rate predefined competencies using a configurable rating scale.
- Collect qualitative feedback through open-ended questions.
- Support multiple evaluator-to-employee relationships:
  - Self — self-assessment
  - Manager — evaluation by the supervisor
  - Direct report — evaluation by subordinates
  - Peer — evaluation by co-workers

### 2. Competency Management
- Define competencies along with their descriptions.
- Assign required competency levels to organizational positions or job roles.

### 3. Reporting
- Generate individual and aggregate reports.
- Produce heat maps that visualize the distribution of competencies across the organization, segmented by departments, teams, or job roles.
- Identify competency gaps relative to the requirements for a given position.

## User Groups
- **HR Administrators** — configure competencies, rating scales, launch evaluation cycles, and generate reports.
- **Managers** — participate in reviewing their direct reports and analyze team outcomes.
- **Employees** — take part in self, peer, and direct report evaluations, and access their personal assessment results.

## Proposed Technologies
- Web application accessible through a browser.
- Reporting module that offers interactive charts and heat maps.

## Tech Stack
- **React 19** with **Vite** (React SWC plugin)
- **Tailwind CSS v4** using the `@tailwindcss/vite` plugin (no separate PostCSS config)
- **Supabase** via `@supabase/supabase-js`
- **TypeScript**, **ESLint**, **Prettier**

Actual versions will be verified and pinned during setup.

## Supabase Setup
Follow the console setup instructions in `docs/SUPABASE_SETUP.md`.

## Local Development
1. Ensure Node.js (LTS) is installed.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the project root with (see `env.local.example`):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the dev server:

```bash
npm run dev
```

We will scaffold the Vite + React app and integrate Tailwind v4 and Supabase in subsequent steps.
