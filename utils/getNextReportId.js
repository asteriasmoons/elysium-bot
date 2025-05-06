// utils/getNextReportId.js
const Counter = require('../models/Counter');

async function getNextReportId() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'report' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

module.exports = getNextReportId;