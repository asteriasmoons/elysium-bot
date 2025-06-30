const mongoose = require("mongoose");

const RecommendationHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // Discord user ID
    bookKey: { type: String, required: true }, // Open Library book key (e.g., '/works/OL12345W')
    recommendedAt: { type: Date, default: Date.now }, // When it was recommended
    genre: { type: String, required: true },
    language: { type: String, required: true },
  },
  { timestamps: true }
);

RecommendationHistorySchema.index({ userId: 1, bookKey: 1 }, { unique: true });

module.exports = mongoose.model(
  "RecommendationHistory",
  RecommendationHistorySchema
);
