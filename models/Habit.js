const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  frequency: { type: String, enum: ["daily", "weekly"], required: true },
  hour: { type: Number, min: 0, max: 23, required: true },
  minute: { type: Number, min: 0, max: 59, required: true },
  dayOfWeek: {
    type: String,
    enum: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    required: function () {
      return this.frequency === "weekly";
    }, // required only for weekly
  },
  timezone: { type: String, default: "America/Chicago" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Habit", habitSchema);
