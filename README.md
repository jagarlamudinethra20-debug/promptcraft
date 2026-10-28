<div align="center">

# 🧠 PROMPT CRAFT — AI Competition & Evaluation Portal

**Full-Stack Real-Time Platform for Live AI Prompt Engineering Competitions**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Framework: TanStack Start](https://img.shields.io/badge/Framework-TanStack%20Start-blue.svg)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-emerald.svg)](https://supabase.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)

<p align="center">
  A high-throughput, real-time competition portal and automated AI evaluation platform built for live hackathons, symposiums, and prompt engineering contests.
</p>

</div>

---

## 🌟 Architecture & Key Capabilities

- **📱 Mobile-First Submission Portal (`/`)**: High-speed, responsive form for contestants to submit participant metadata, registration ID, selected LLM, prompt text, and model response. Generates unique alphanumeric receipts (`PC-XXXX`) on submission. Controlled by instant live start/pause competition gating.
- **🤖 Resilient Multi-LLM Judge Engine**: Evaluates queued submissions using a fault-tolerant provider fallback chain (**Groq** $\rightarrow$ **Google Gemini** $\rightarrow$ **Lovable AI Gateway**). Atomic database leases prevent race conditions and ensure zero double-judging.
- **🎯 Dual Scientific Rubric System**:
  - **7 Competition Criteria** (100 pts each): Relevance, Prompt Clarity, Domain Grounding, Output Quality, Innovation, Feasibility, and Ethical AI Use.
  - **11 Technical Prompt Engineering Parameters** (100 pts each): Role Assignment, Task Definition, Context Provision, Constraints, Output Format, Tone Control, Few-Shot Guidance, Chain-of-Thought Cues, Audience Targeting, Evidence Grounding, and Iteration Hooks.
- **📚 Domain RAG Grounding**: Embedded with 20 curated domain knowledge chunks (e.g. Agronomic Super El Niño mitigation, Alternate Wetting & Drying, Direct-Seeded Rice) to ground the automated judges in factual domain accuracy.
- **🛡️ Admin Command Center (`/admin`)**: Password-gated dashboard featuring live queue telemetry, Start/Pause competition controls, batch "Evaluate Queue" trigger, expandable submission inspection, manual score overrides with mandatory audit notes, and one-click CSV export.
- **🏆 Live Ranked Leaderboard (`/leaderboard`)**: Real-time rankings with sports-standard tied rank resolution (1, 1, 3) and combined competition & prompt engineering scores.
- **📽️ Stage Projector Screen (`/stage`)**: Full-screen, high-contrast dark theme view designed for event projectors, featuring dynamic participant submission QR codes and live top-tier standings.

---

## 🏗️ Tech Stack

- **Full-Stack Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack SSR + Server Functions)
- **Routing**: [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)
- **Data Fetching & Cache**: [TanStack Query](https://tanstack.com/query) v5
- **Database & Auth**: [Supabase](https://supabase.com/) PostgreSQL with Row-Level Security (RLS)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Runtime / Package Manager**: Bun or Node.js 20+

---

## 📁 Repository Structure

```text
├── src/
│   ├── components/         # Reusable UI widgets & PasswordGate
│   ├── hooks/              # Custom React hooks (use-mobile, etc.)
│   ├── integrations/       # Supabase client, admin client, and middleware
│   ├── lib/
│   │   ├── admin-key.ts            # Client-side session key management
│   │   ├── competition.server.ts   # Core server functions (AI judge, queue, auth)
│   │   ├── competition-rubric.ts   # 7-metric & 11-metric scoring definitions
│   │   └── rag-knowledge.server.ts # Domain grounding knowledge base
│   └── routes/             # File-based routes
│       ├── __root.tsx      # App shell & layout
│       ├── index.tsx       # Participant submission portal
│       ├── admin.tsx       # Admin command center & queue management
│       ├── leaderboard.tsx # Live ranked scoreboard
│       └── stage.tsx       # Full-screen projector stage view
├── supabase/
│   ├── config.toml         # Supabase local configuration
│   └── migrations/         # PostgreSQL DDL, triggers, and RLS policies
├── .env.example            # Environment variables template
└── vite.config.ts          # Vite & TanStack Start build configuration
```

---

## 🚀 Quick Start & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jagarlamudinethra20-debug/promptcraftviat.git
cd promptcraftviat
```

### 2. Install Dependencies

Using [Bun](https://bun.sh/) (recommended):
```bash
bun install
```
Or using npm:
```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Populate the following keys in `.env`:

```env
# Supabase Database & API Keys
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_PROJECT_ID="your-project-id"

# Admin Dashboard Password
ADMIN_PASSWORD="your-secure-admin-password"

# AI Judge API Keys (Configure at least one)
GROQ_API_KEY="gsk_..."
GEMINI_API_KEY="AIzaSy..."
LOVABLE_API_KEY="..."
```

### 4. Database Setup

Apply the SQL migration in `supabase/migrations/20260829065621_4bab2efa-b82d-46c9-a36f-f953bff8b7de.sql` directly in your Supabase SQL Editor to provision:
- `competition_sessions` table
- `submissions` table
- `evaluations` table
- Row Level Security (RLS) policies and automatic `updated_at` triggers

### 5. Run the Local Development Server

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Participant Portal**: `http://localhost:3000/`
- **Admin Command Center**: `http://localhost:3000/admin`
- **Leaderboard**: `http://localhost:3000/leaderboard`
- **Stage Screen**: `http://localhost:3000/stage`

---

## 🔒 Security Best Practices

- **Zero Hardcoded Secrets**: All API tokens, service keys, and passwords are read strictly from runtime environment variables.
- **Server-Side Isolation**: The AI judge, service-role database operations, and score overrides execute exclusively within server functions and never bundle into client JavaScript.
- **Row-Level Security**: Direct client database modifications are blocked via PostgreSQL RLS policies; submissions and evaluation records are mediated through server RPCs.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
