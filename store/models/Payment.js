// ============================================================
// store/models/Payment.js — To'lovlar tarixi (audit log)
// ============================================================
// Har bir muvaffaqiyatli Stars to'lovi bu kolleksiyaga yoziladi.
// Bu moliyaviy shaffoflik va nizolarni hal qilish uchun zarur.
// ============================================================

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Kim to'ladi
  voterId:      { type: Number, required: true },
  voterName:    { type: String },

  // Kimga ovoz berdi
  targetUserId: { type: Number, required: true },
  targetName:   { type: String },

  // To'lov ma'lumotlari
  amount:          { type: Number, required: true }, // XTR miqdori
  votesAdded:      { type: Number, required: true },
  chargeId:        { type: String, required: true, unique: true }, // Telegram charge ID
  invoicePayload:  { type: String },

  // Kontekst
  battleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Battle' },
  stage:        { type: Number },

}, { timestamps: true });

// Tezkor qidiruv uchun indekslar
PaymentSchema.index({ voterId: 1 });
PaymentSchema.index({ targetUserId: 1 });
PaymentSchema.index({ chargeId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', PaymentSchema);

