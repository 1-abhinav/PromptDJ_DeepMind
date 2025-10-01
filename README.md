<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16OnYeZQPe9pM4cMTTPKb2Hp0nqK-AQrD

## What is this app?

PromptDJ (DeepMind) lets you control real‑time, AI‑generated music using a grid of text prompts and an optional MIDI controller. Each prompt has a weight (0–2) that steers the model towards that musical idea. You can play/pause the stream, edit prompt text, and map MIDI CCs to knobs to perform the mix live.

### How it works (brief)
- UI is built with Lit web components (`prompt-dj-midi`, `prompt-controller`, `weight-knob`, `play-pause-button`).
- The app connects to the Google GenAI Live Music API (`lyria-realtime-exp`) and streams audio chunks.
- Active prompts (weight > 0) are sent to the model; incoming audio is decoded and scheduled via the Web Audio API for continuous playback.
- A small audio analyser drives subtle visuals, and Web MIDI (if available) lets you learn and control prompt weights from hardware.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
