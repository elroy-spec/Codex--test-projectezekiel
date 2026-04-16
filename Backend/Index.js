const express = require("express");
const app = express();

app.use(express.json());

/**
 * QUESTION DATABASE (Phase 3.5)
 */
const questions = {
  math: {
    easy: [
      { q: "2 + 2", options: [1, 2, 3, 4], answer: 4 },
      { q: "5 - 1", options: [2, 3, 4, 5], answer: 4 }
    ],
    medium: [
      { q: "12 × 3", options: [24, 30, 36, 42], answer: 36 }
    ]
  },

  physics: {
    easy: [
      { q: "Unit of force?", options: ["Newton", "Watt"], answer: "Newton" }
    ],
    medium: [
      { q: "Speed formula?", options: ["d/t", "t/d"], answer: "d/t" }
    ]
  }
};

/**
 * BASE ROUTE
 */
app.get("/api/", (req, res) => {
  res.json({
    name: "API Server",
    status: "running",
    endpoints: [
      "GET /api/",
      "GET /api/healthz",
      "GET /api/topics",
      "GET /api/question?topic=<topic>&difficulty=<easy|medium>"
    ]
  });
});

/**
 * HEALTH CHECK
 */
app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * TOPICS LIST
 */
app.get("/api/topics", (req, res) => {
  res.json({
    topics: Object.keys(questions)
  });
});

/**
 * SMART QUESTION ENGINE
 */
app.get("/api/question", (req, res) => {
  const topic = req.query.topic || "math";
  const difficulty = req.query.difficulty || "easy";

  const topicData = questions[topic];

  if (!topicData) {
    return res.json({ error: "Invalid topic" });
  }

  const pool = topicData[difficulty];

  if (!pool || pool.length === 0) {
    return res.json({ error: "No questions for this difficulty" });
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const question = pool[randomIndex];

  res.json({
    topic,
    difficulty,
    question: question.q,
    options: question.options
  });
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
