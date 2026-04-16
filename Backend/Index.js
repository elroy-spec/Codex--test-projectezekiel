import express from "express";
import mongoose from "mongoose";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());

/* ---------------- CONFIG ---------------- */

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------------- DB ---------------- */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

/* ---------------- MODELS ---------------- */

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const sessionSchema = new mongoose.Schema({
  user: String,
  topic: String,
  difficulty: String,
  score: Number,
  total: Number,
  currentAnswer: String,
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);

/* ---------------- RATE LIMIT ---------------- */

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120
}));

/* ---------------- AUTH ---------------- */

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "NO_TOKEN" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

/* ---------------- BASE ROUTES ---------------- */

app.get("/api/", (req, res) => {
  res.json({
    name: "AI Exam Engine",
    version: "FINAL",
    status: "running"
  });
});

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/topics", (req, res) => {
  res.json({
    topics: ["math", "physics", "chemistry", "biology"]
  });
});

/* ---------------- RULE ENGINE ---------------- */

const questions = {
  math: {
    easy: [
      { q: "2 + 2", options: ["1","2","3","4"], answer: "4" },
      { q: "5 - 1", options: ["2","3","4","5"], answer: "4" }
    ]
  }
};

app.get("/api/question", (req, res) => {
  const topic = req.query.topic || "math";
  const difficulty = req.query.difficulty || "easy";

  const pool = questions?.[topic]?.[difficulty];

  if (!pool) {
    return res.status(404).json({ error: "NO_QUESTION_FOUND" });
  }

  const q = pool[Math.floor(Math.random() * pool.length)];

  res.json({
    topic,
    difficulty,
    question: q.q,
    options: q.options
  });
});

/* ---------------- AUTH ROUTES ---------------- */

app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || password.length < 6) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "USER_EXISTS" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({ username, password: hashed });

  res.json({ message: "User created" });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const token = jwt.sign({ username }, JWT_SECRET, {
    expiresIn: "24h"
  });

  res.json({ token });
});

/* ---------------- TEST SYSTEM ---------------- */

app.post("/api/test/start", authenticate, async (req, res) => {
  const { topic = "math", difficulty = "easy" } = req.body;

  const session = await Session.create({
    user: req.user.username,
    topic,
    difficulty,
    score: 0,
    total: 0
  });

  res.json({ sessionId: session._id });
});

app.get("/api/test/question", authenticate, async (req, res) => {
  const { sessionId } = req.query;

  const session = await Session.findById(sessionId);

  if (!session) return res.status(404).json({ error: "INVALID_SESSION" });

  if (session.user !== req.user.username) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (session.completed) {
    return res.status(409).json({ error: "SESSION_COMPLETED" });
  }

  const pool = questions?.[session.topic]?.[session.difficulty];
  const q = pool[Math.floor(Math.random() * pool.length)];

  session.currentAnswer = q.answer;
  await session.save();

  res.json({
    question: q.q,
    options: q.options
  });
});

app.post("/api/test/answer", authenticate, async (req, res) => {
  const { sessionId, answer } = req.body;

  const session = await Session.findById(sessionId);

  if (!session) return res.status(404).json({ error: "INVALID_SESSION" });

  if (session.user !== req.user.username) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (session.completed) {
    return res.status(409).json({ error: "SESSION_COMPLETED" });
  }

  session.total++;

  let correct = false;

  if (answer == session.currentAnswer) {
    session.score++;
    correct = true;
  }

  await session.save();

  res.json({ correct });
});

app.get("/api/test/result", authenticate, async (req, res) => {
  const session = await Session.findById(req.query.sessionId);

  if (!session) return res.status(404).json({ error: "INVALID_SESSION" });

  res.json({
    score: session.score,
    total: session.total,
    percentage: session.total ? (session.score / session.total) * 100 : 0
  });
});

/* ---------------- AI ---------------- */

app.get("/api/ai/status", (req, res) => {
  res.json({
    ready: !!process.env.OPENAI_API_KEY
  });
});

app.post("/api/ai/complete", async (req, res) => {
  try {
    const { topic = "math", difficulty = "easy" } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Generate a MCQ question on ${topic} (${difficulty}) in JSON`
        }
      ]
    });

    res.json({
      result: response.choices[0].message.content
    });

  } catch (err) {
    res.status(500).json({
      error: "AI_ERROR",
      message: err.message
    });
  }
});

/* ---------------- 404 ---------------- */

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND" });
});

/* ---------------- START ---------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
