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
  res.json({
    topic: "math",
    question: "What is 5 + 3?",
    options: [5, 6, 7, 8],
    answer: 8
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
