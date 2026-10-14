import express from "express";

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.static("public"));

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Demo "nearby partners" (replace with real data in a full product)
const PARTNERS = [
  { name: "Sri Sai Tiffin Centre", type: "tiffin centre", km: 1.2, uses: "tomato, onion, brinjal, leafy greens" },
  { name: "Campus Hostel Mess", type: "hostel mess", km: 2.5, uses: "bulk vegetables, potato, onion" },
  { name: "Ravi Fruits & Kirana", type: "kirana shop", km: 3.1, uses: "fruits, tomato, banana" },
  { name: "Annapurna Community Kitchen", type: "donation", km: 4.0, uses: "any edible produce" },
  { name: "Lakshmi Dairy Farm", type: "animal feed", km: 5.0, uses: "overripe vegetables, banana, greens" },
  { name: "Ward Compost Point", type: "compost", km: 1.8, uses: "spoiled produce" },
];

async function gemini(parts, schema, system) {
  if (!KEY) throw new Error("GEMINI_API_KEY is not set on the server");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.3 },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini error ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return JSON.parse(j.candidates[0].content.parts[0].text);
}

const S = (type, extra = {}) => ({ type, ...extra });

const analyzeSchema = S("OBJECT", {
  properties: {
    summary: S("STRING"),
    items: S("ARRAY", {
      items: S("OBJECT", {
        properties: {
          name: S("STRING"),
          quantity_kg: S("NUMBER"),
          freshness_score: S("INTEGER"),
          hours_left: S("NUMBER"),
          discount_percent: S("INTEGER"),
          advice: S("STRING"),
          second_life: S("ARRAY", {
            items: S("OBJECT", {
              properties: { partner: S("STRING"), action: S("STRING"), why: S("STRING") },
              required: ["partner", "action", "why"],
            }),
          }),
        },
        required: ["name", "quantity_kg", "freshness_score", "hours_left", "discount_percent", "advice", "second_life"],
      }),
    }),
  },
  required: ["summary", "items"],
});

const farmerSchema = S("OBJECT", {
  properties: {
    produce: S("STRING"),
    quantity_kg: S("NUMBER"),
    ready_by: S("STRING"),
    best_partner: S("STRING"),
    distance_km: S("NUMBER"),
    reason: S("STRING"),
    price_tip: S("STRING"),
  },
  required: ["produce", "quantity_kg", "ready_by", "best_partner", "distance_km", "reason", "price_tip"],
});

const langName = (l) => (l === "te" ? "Telugu" : "English");

app.post("/api/analyze", async (req, res) => {
  try {
    const { image, lang } = req.body;
    if (!image) return res.status(400).json({ error: "No image received" });
    const system = `You help small Indian vegetable/fruit vendors cut food waste.
Look at the photo. For each distinct fruit or vegetable visible, estimate: quantity_kg (rough), freshness_score (0-100),
hours_left (realistic remaining sellable life at Indian room temperature), discount_percent (0-70; higher when hours_left is low),
a one-sentence advice, and up to 3 second_life options chosen ONLY from these nearby partners, best first:
${JSON.stringify(PARTNERS)}
Match partners to what they can use and to how little time is left. If produce is still very fresh, second_life may be empty.
If the photo has no produce, return an empty items array and explain in summary.
Write summary, advice, action and why in ${langName(lang)}. Keep partner names unchanged. Be honest about uncertainty.`;
    const out = await gemini(
      [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: "Analyse this stock." }],
      analyzeSchema,
      system
    );
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/farmer", async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Please say or type your produce details" });
    const system = `A local farmer describes produce ready to sell. Extract produce, quantity_kg and ready_by.
Then pick the single best buyer from these nearby partners (consider distance and what they use):
${JSON.stringify(PARTNERS)}
Explain briefly why, and give a fair-price tip (no made-up exact market prices; give a practical tip).
Write reason and price_tip in ${langName(lang)}. Keep partner names unchanged.`;
    const out = await gemini([{ text }], farmerSchema, system);
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (_req, res) => res.send("ok"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Dukaan Saathi running on :${port}`));
