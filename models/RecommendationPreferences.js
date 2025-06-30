const mongoose = require("mongoose");

const RecommendationPreferencesSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true }, // Discord user ID
    interval: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    notify: { type: String, enum: ["channel", "dm"], default: "dm" },
    genres: { type: [String], default: ["fantasy"] }, // e.g., ['fantasy', 'romance']
    languages: { type: [String], default: ["en"] }, // e.g., ['en', 'es']
    lastSent: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "RecommendationPreferences",
  RecommendationPreferencesSchema
);
