# agen+cy

## The Phases
The agents follow a structured design process (skeuomorphism of real creative work):
1. **Brief Expansion** — Kevin writes a detailed PRD from your one-liner
2. **Phase 1: Foundation** — Hero section, navigation, typography
3. **Phase 2: Content** — Sections, bento grids, real copy
4. **Phase 3: Motion** — GSAP, ScrollTrigger, Lenis smooth scroll
5. **Phase 4: Polish** — Noise textures, glassmorphism, refinements
6. **Phase 5+: Infinite Loop** — Expansion, micro-interactions, experimental features

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/the-agency.git
cd the-agency

# Install dependencies
npm install
```

### Configuration
Add your Gemini API key to `.env.local`:
```env
GEMINI_API_KEY=your_api_key_here
```

### Run
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) and enter a brief like:
> *"A brutalist portfolio for a fashion house called VOID with large typography and scroll-triggered reveals"*

Then sit back and watch the show.

---

## 🎛️ Controls
| Action | Description |
|--------|-------------|
| **Pause/Resume** | Freeze the simulation to inspect or download |
| **Director Mode** | Inject custom events or preset scenarios |
| **Download** | Export the current HTML at any point |
| **Window Management** | Drag, stack, and resize windows like a real OS |
| **Mute** | Toggle lo-fi beats and keyboard SFX |

---

## 🧠 Philosophy

### Software as Slow TV
We're so used to the ChatGPT typing effect—text appearing digit-by-digit. It's skeuomorphism of a 1980s teletype, and honestly, a bit of a dark pattern.
agen+cy explores **Ambient Computing**: the space between "lean in" (solving urgent tickets) and "lean back" (Netflix asking "are you still watching?"). You watch the drama, but you feel ownership because *you signed the checks*.

### The Sims Effect
By treating agents as **characters** rather than functions—complete with GIFs, personalities, and interpersonal dynamics—we trigger the same emotional response that made us care about our Sims. It's low-fidelity emotion, but it works.

### Embracing Hallucinations
In creative work, misunderstandings are features, not bugs. The Director agent intentionally injects randomness. Think of design as quantum physics: all ideas exist in a possibility space until discussion collapses the wave function.

---

## 🏗️ Tech Stack
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS (inline)
- **AI**: Google Gemini (Flash for banter, Pro for coding)
- **Audio**: Web Audio API (procedural lo-fi generation)
- **Animation**: GSAP + Lenis (in generated code)

---

## 📁 Project Structure

```
the-agency/
├── App.tsx                 # Main simulation loop & window manager
├── components/
│   ├── ChatSidebar.tsx     # Agent conversation feed
│   ├── CodeEditor.tsx      # Syntax-highlighted code view
│   ├── CursorOverlay.tsx   # Fake multiplayer cursors
│   ├── KanbanBoard.tsx     # Task management UI
│   ├── LivePreview.tsx     # iframe preview of generated site
│   ├── Moodboard.tsx       # Draggable inspiration board
│   ├── MusicPlayer.tsx     # Lo-fi beat controls
│   ├── TicTacToe.tsx       # Easter egg game
│   └── WindowFrame.tsx     # Draggable OS-style window
├── services/
│   └── gemini.ts           # AI orchestration & structured generation
├── utils/
│   ├── music.ts            # Procedural audio engine
│   └── sound.ts            # SFX helpers
├── constants.ts            # Characters, presets, initial state
└── types.ts                # TypeScript definitions
```

---

## 💰 Cost Warning
This project makes **many** API calls to Gemini. Each "turn" of the simulation is a call. Image generation is additional. Monitor your usage in Google AI Studio.

---

## 🙏 Credits
Built by [Ramon Marc](mailto:hej@ramonmarc.com) through hundreds of random prototypes, conversations with friends, playing way too many games, and watching The Office on repeat.
Special thanks to **Rich** for being a thought partner along the way.

---

## 📜 License
MIT — Do whatever you want. Just don't blame me when the AI agents unionize.

---

<div align="center">
*"The standard Landing Page is going the way of the portrait painting."*
</div>