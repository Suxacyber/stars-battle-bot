// ============================================================
// store/models/Payment.js — To'lovlar tarixi (audit log)
// ============================================================

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  voterId:        { type: Number, required: true },
  voterName:      { type: String },
  targetUserId:   { type: Number, required: true },
  targetName:     { type: String },
  amount:         { type: Number, required: true },
  votesAdded:     { type: Number, required: true },
  // unique: true shu yerda — schema.index() da qayta yozmaymiz
  chargeId:       { type: String, required: true, unique: true },
  invoicePayload: { type: String },
  battleId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Battle' },
  stage:          { type: Number },
}, { timestamps: true });

// Faqat qo'shimcha indekslar (chargeId ni qayta yozmaymiz!)
PaymentSchema.index({ voterId: 1 });
PaymentSchema.index({ targetUserId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);


