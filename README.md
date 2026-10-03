# Campus Food Court

<p align="center">
  <strong>A modern campus food-ordering platform built for real student workflows.</strong>
</p>

<p align="center">
  <a href="https://campus-food-court.vercel.app">Live Demo</a> ·
  <a href="https://github.com/krish6500/campus-food-court">Repository</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
</p>

## Overview

Campus Food Court is a full-stack web application designed to make campus food ordering simpler for students while providing a foundation for order management and backend persistence.

The project focuses on practical product development: responsive UI, reusable React components, authenticated data flows, database integration, and a production deployment workflow.

## Highlights

- 🍔 Campus-focused food browsing and ordering experience
- 📱 Responsive interface for desktop and mobile
- 🗃️ Supabase-backed order and data persistence
- ⚡ Next.js App Router architecture
- 🔐 Environment-based configuration for sensitive credentials
- 🚀 Deployed on Vercel
- 🧩 TypeScript-first implementation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend / Data | Supabase |
| Tooling | ESLint, npm |
| Deployment | Vercel |

## Project Structure

```text
campus-food-court/
├── app/                 # Application routes and UI
├── backend-models/      # Backend/domain models
├── lib/                 # Shared utilities and integrations
├── public/              # Static assets
├── supabase-*.sql       # Database setup / migration scripts
├── .env.example         # Environment variable template
└── package.json
```

## Run Locally

```bash
git clone https://github.com/krish6500/campus-food-court.git
cd campus-food-court
npm install
```

Create your local environment file from `.env.example`, then start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production

**Live application:** https://campus-food-court.vercel.app

## What I Learned

This project helped me work across the complete web-development workflow—from component design and state handling to database integration, environment configuration, deployment, and maintaining a production-oriented codebase.

## Author

**Krish M. Jadhav**

Computer Science Engineering student focused on building practical software with **Java, Python, React, Next.js, TypeScript and databases**.

<p align="center">
  <sub>Built with curiosity, shipped with intent.</sub>
</p>
