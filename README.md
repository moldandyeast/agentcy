# The Agency

An AI-powered simulation of a creative agency team building websites autonomously. Five AI characters collaborate in real-time—writing briefs, designing mockups, generating code, and managing tasks through chat.

## What it does

Give the team a one-line prompt like "build a brutalist portfolio site" and watch them:

- Expand it into a detailed brief (Kevin, Product Manager)
- Generate design mockups and moodboards (Ramona, Art Director)
- Write production-ready HTML/CSS/JS (Rich, Engineer)
- Manage tasks on a kanban board
- Iterate and improve based on team discussion

All code renders live in an embedded preview. The interface mimics a desktop OS with draggable windows for chat, code editor, live preview, moodboard, and more.

## Tech

- **Frontend**: React + TypeScript + Vite + Tailwind
- **AI**: Google Gemini (2.5-flash for chat, 3-pro for code, flash-image for mockups)
- **Audio**: Generative lo-fi music via Web Audio API + Tonal.js

## Setup

```bash
npm install
cp .env.example .env.local  # then add your API key
npm run dev
```

Get a Gemini API key: https://aistudio.google.com/app/api-keys

## Features

- **Autonomous workflow**: AI team follows agency roles (PM → Designer → Engineer)
- **Real code generation**: Outputs valid HTML that renders in iframe
- **Director mode**: Inject events like "client wants more animations" mid-session
- **Generative music**: Lo-fi beats that respond to team activity
- **Desktop OS interface**: Draggable, resizable windows with dock

## Characters

- **Kevin** (Product): Anxious about scope creep, writes detailed PRDs
- **Ramona** (Art Director): Refuses to let Rich code without mockups
- **Rich** (Engineer): 10x developer, obsessed with performance
- **0xNonSense** (Growth): Writes copy in crypto-bro slang
- **Marc** (Intern): Generates weird AI images, just happy to be here
