
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

/**
 * AI CLIENT
 * Make sure OPENAI_API_KEY is set in Replit Secrets
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * HEALTH CHECK
 */
app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * TOPICS (optional fallback system)
 */
app.get("/api/topics", (req, res) => {
  res.json({
    topics: ["math", "physics", "chemistry", "biology", "general"]
  });
});

/**
 * BASIC QUESTION (fallback / non-AI mode)
 */
app.get("/api/question", (req, res) => {
  const topic = req.query.topic || "math";

  res.json({
    topic,
    question: "What is 2 + 2?",
    options: [1, 2, 3, 4],
    answer: 4
  });
});

/**
 * AI QUESTION GENERATOR (MAIN FEATURE)
 */
app.get("/api/ai-question", async (req, res) => {
  try {
    const topic = req.query.topic || "math";
    const difficulty = req.query.difficulty || "easy";

    const prompt = `
You are a question generator for students.

Generate ONE multiple choice question.

Rules:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Must be clear and educational
- Must have 4 options
- Only ONE correct answer

Return ONLY valid JSON:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": "..."
}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate strict JSON only. No explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.choices[0].message.content;

    // safe parsing
    const json = JSON.parse(text);

    res.json({
      topic,
      difficulty,
      ...json
    });

  } catch (err) {
    res.status(500).json({
      error: "AI generation failed",
      message: err.message
    });
  }
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
