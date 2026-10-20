<div align="center">

# Manimly

### Interactive AI Studio for Mathematical Animations

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Rust](https://img.shields.io/badge/Rust-WASM-DEA584?logo=rust)](https://www.rust-lang.org/)

**Manimly** is a local-first video editor and authoring studio designed specifically for mathematical animations. By treating Manim scenes as first-class timeline clips, Manimly bridges the gap between natural language animation prompts, Python source code, and a multi-track editing timeline.

</div>

---

## Highlights

- **Prompt-to-Animation Studio**: Generate mathematical scenes directly from natural language or customize ready-to-use math presets.
- **First-Class Manim Clips**: Manim animations sit directly on a multi-track timeline alongside standard video, audio, text, and image tracks.
- **Live Code Inspector & Rollback**: Inspect and fine-tune generated Manim Python code with an integrated editor, full version history, and one-click rollback.
- **Mathematical Presets**: Instant starter scenes for Fourier Series, Neural Networks, Riemann Sums, Lorenz Attractors, Calculus Limits, and Linear Transformations.
- **Local-First & Private**: Everything stays on your machine. Projects persist locally as clean JSON files without external database or cloud account requirements.
- **High-Performance Compositor**: Powered by a Rust / WebAssembly media engine for frame-accurate playback, trimming, splitting, and previewing.
- **Calm, Distraction-Free UI**: Crafted using Notion-inspired design tokens for an intuitive, clutter-free workspace.

---

## Overview

Traditional mathematical animation workflows often require juggling terminal commands, waiting for full re-renders, and splicing clips in external video editing software.

Manimly integrates the entire cycle into a single canvas:

1. **Describe or Pick**: Enter a prompt or select a curated mathematical concept.
2. **Inspect & Tweak**: Review generated Python code, adjust parameters, or apply iterative refinement.
3. **Sequence & Compose**: Arrange clips, apply transitions, layer voiceover and audio tracks, and trim with precision on the timeline.
4. **Export**: Export high-resolution renders ready for sharing, teaching, or video production.

---

## Project Structure

```
Manimly/
├── apps/
│   └── web/                # Next.js 16 web application & editor studio
├── rust/                   # Core media compositor and WASM bindings
├── projects/               # Local project persistence (.json files)
├── docs/                   # Architectural notes and technical guides
└── package.json            # Monorepo configuration (pnpm workspace)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or newer)
- [pnpm](https://pnpm.io/) (v9 or v11 recommended)
- [Python](https://www.python.org/) 3.10+ with [Manim Community](https://www.manim.community/) (for local rendering)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/shubhamrawat-gh/Manimly.git
   cd Manimly
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment:**

   ```bash
   # Copy the example environment configuration
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Start the web studio:**

   ```bash
   pnpm dev:web
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to launch the editor.

---

## Architecture & Technology

- **Frontend Studio**: Built with Next.js 16 (Turbopack), React 19, and Tailwind CSS.
- **Editor State**: Zustand stores managing timeline tracks, playhead position, clip selection, and toolbars.
- **Media Engine**: Rust-compiled WebAssembly (`opencut-wasm`) handling frame-accurate media composition.
- **Local Storage**: Filesystem project storage via `/api/projects` with resilient IndexedDB browser caching.

---

## Initial Release Notes

This is the initial release of Manimly. The foundational frontend studio, interactive timeline, Manim clip data models, asset creation panels, and local persistence layer are active.

Contributions, feedback, and issue reports are welcome as the platform evolves!

---

## Contributing

We welcome contributions from educators, animators, and developers.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [Manim Community](https://www.manim.community/) for the animation engine powering mathematical visualizations.
- OpenCut for timeline and media compositor foundations.

<!-- Documentation verified: 2026-10-20 -->
