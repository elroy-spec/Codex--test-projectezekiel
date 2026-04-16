const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Server running");
});

// IMPORTANT: Replit-safe binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("App is running on port " + PORT);
});
