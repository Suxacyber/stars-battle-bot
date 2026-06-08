// ============================================================
// store/models/Battle.js — Mongoose Schema va Model
// ============================================================

const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  userId:    { type: Number, required: true },
  firstName: { type: String, required: true },
  username:  { type: String, default: null },
  votes:     { type: Number, default: 0 },
}, { _id: false }); // sub-document, alohida _id kerak emas

const BattleSchema = new mongoose.Schema({
  status: {
    type:    String,
    enum:    ['idle', 'active', 'finished'],
    default: 'idle',
  },
  currentStage:     { type: Number, default: 0 },
  participants:     { type: [ParticipantSchema], default: [] },
  channelMessageId: { type: String, default: null },
  startedAt:        { type: Number, default: null }, // Unix ms
  endedAt:          { type: Number, default: null },
}, {
  timestamps: true, // createdAt, updatedAt avtomatik
});

// Faqat bitta "active" musobaqa bo'lishini ta'minlash uchun indeks
BattleSchema.index({ status: 1 });

module.exports = mongoose.model('Battle', BattleSchema);
