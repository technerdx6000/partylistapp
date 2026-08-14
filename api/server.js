// filepath: c:\Users\techn\Documents\apps\partylistapp\backend\server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const peopleRoutes = require("./routes/people");
const itemsRoutes = require("./routes/items");
const categoriesRoutes = require("./routes/categories");
const requiredItemsRoutes = require("./routes/required-items");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/people", peopleRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/required-items", requiredItemsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Party List API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Party List API server running on port ${PORT}`);
});
