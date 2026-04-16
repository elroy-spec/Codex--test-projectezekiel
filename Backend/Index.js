import express from "express";
import OpenAI from "openai";
import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));
const app = express();

app.use(express.json({ limit: "1mb" }));

/**
 * OPENAI CLIENT
 * (must be set in environment variables)
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * -----------------------
 * BASIC HEALTH ROUTES
 * -----------------------
 */

app.get("/api/", (req, res) => {
  res.json({
    name: "AI Exam Engine API",
    status: "running",
    version: "4.0"
  });
});

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * -----------------------
 * TOPICS
 * -----------------------
 */

const topics = ["math", "physics", "chemistry", "biology", "general"];

app.get("/api/topics", (req, res) => {
  res.json({ topics });
});

/**
 * -----------------------
 * RULE-BASED ENGINE (fallback)
 * -----------------------
 */

const questions = {
  math: {
    easy: [
      { q: "2 + 2", options: ["1", "2", "3", "4"], answer: "4" },
      { q: "5 - 1", options: ["2", "3", "4", "5"], answer: "4" }
    ]
  },

  physics: {
    easy: [
      {
        q: "Unit of force?",
        options: ["Newton", "Watt", "Joule", "Pascal"],
        answer: "Newton"
      }
    ]
  }
};

app.get("/api/question", (req, res) => {
  const topic = req.query.topic || "math";
  const difficulty = req.query.difficulty || "easy";

  const pool = questions?.[topic]?.[difficulty];

  if (!pool) {
    return res.status(404).json({
      error: "NO_QUESTION_FOUND"
    });
  }

  const q = pool[Math.floor(Math.random() * pool.length)];

  res.json({
    topic,
    difficulty,
    question: q.q,
    options: q.options
  });
});

/**
 * -----------------------
 * AI QUESTION ENGINE
 * -----------------------
 */

function validateAIResponse(data) {
  return (
    data &&
    typeof data.question === "string" &&
    Array.isArray(data.options) &&
    data.options.length === 4 &&
    typeof data.answer === "string"
  );
}

app.post("/api/ai/complete", async (req, res) => {
  try {
    const { topic = "math", difficulty = "easy" } = req.body;

    const prompt = `
Generate ONE exam question.

Topic: ${topic}
Difficulty: ${difficulty}

STRICT RULES:
- Return ONLY JSON
- 4 options exactly
- 1 correct answer
- No explanations outside JSON

Format:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": "...",
  "explanation": "..."
}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON generator. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const raw = response.choices[0].message.content;

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return res.status(500).json({
        error: "INVALID_JSON_FROM_AI",
        raw
      });
    }

    if (!validateAIResponse(parsed)) {
      return res.status(500).json({
        error: "INVALID_AI_STRUCTURE",
        raw: parsed
      });
    }

    res.json({
      topic,
      difficulty,
      ...parsed
    });
  } catch (err) {
    res.status(500).json({
      error: "AI_REQUEST_FAILED",
      message: err.message
    });
  }
});

/**
 * -----------------------
 * GLOBAL ERROR HANDLING
 * -----------------------
 */

app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND"
  });
});

/**
 * -----------------------
 * START SERVER
 * -----------------------
 */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
