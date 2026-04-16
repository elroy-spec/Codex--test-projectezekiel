const questions = {
  math: [
    { q: "5 + 3", options: [5, 6, 7, 8], answer: 8 },
    { q: "10 - 4", options: [5, 6, 7, 8], answer: 6 }
  ],
  physics: [
    { q: "Unit of force?", options: ["Newton", "Watt", "Joule"], answer: "Newton" }
  ]
};
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Server running");
});

// IMPORTANT: Replit-safe binding
const PORT = process.env.PORT || 3000;
app.get("/topics", (req, res) => {
  res.json({
    topics: ["physics", "chemistry", "biology", "math"]
  });
});
app.get("/question", (req, res) => {
  const topic = req.query.topic || "math";

  const pool = questions[topic];

  if (!pool) {
    return res.json({ error: "No questions for this topic" });
  }

  const random = pool[Math.floor(Math.random() * pool.length)];

  res.json({
    topic,
    question: random.q,
    options: random.options
  });
});
app.post("/check", (req, res) => {
  const { answer } = req.body;

  const correctAnswer = 8;

  if (answer == correctAnswer) {
    res.json({ correct: true });
  } else {
    res.json({ correct: false });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log("App is running on port " + PORT);
});
