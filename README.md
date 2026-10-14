# Dukaan Saathi: AI Freshness Clock for Local Shops and Farmers

Built for **Prompt Wars x Creative Community VVITU** (AI for Better Living and Smarter Communities).

## Problem
Small neighbourhood shops and local farmers lose money every day to spoiled produce and poor demand guesses, while nearby supply and demand never connect.

## Solution
Photograph a stall. Gemini Vision reads the produce and estimates quantity, freshness and hours left. The app shows a live **Freshness Clock**, a suggested discount, and a **second-life ladder** (nearby tiffin centre, hostel mess, donation, animal feed, compost) so nothing is wasted. Farmers can speak or type what they have, and the app matches it to the best nearby buyer. A counter tracks kg of food saved.

## How Gemini is used
- **Vision:** reads produce, quantity and freshness from a photo
- **Reasoning:** estimates remaining shelf life and picks the best next use from nearby partners
- **Structured output:** responses are schema-validated JSON, so the UI never relies on hard-coded results
- **Multilingual:** advice in English or Telugu

## Run locally
```bash
npm install
export GEMINI_API_KEY=your_key      # get one at aistudio.google.com
npm start                           # http://localhost:8080
```

## Deploy (Google Cloud Run)
```bash
gcloud run deploy dukaan-saathi --source . --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=your_key
```
Alternative: create a free Web Service on Render from this repo (build: `npm install`, start: `npm start`, env var `GEMINI_API_KEY`).

## Notes
- The API key lives only on the server (environment variable), never in browser code.
- Nearby partners are demo data in `server.js`; a full product would use real local listings.
- Freshness and shelf-life values are AI estimates, not lab measurements.
