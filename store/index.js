// ============================================================
// store/index.js — MongoDB asosidagi ma'lumotlar qatlami
// ============================================================
// Handler'lar bu modulni chaqiradi — DB bilan to'g'ridan-to'g'ri
// ishlamaydi. Barcha funksiyalar async/await ga o'tkazildi.
// ============================================================

const Battle  = require('./models/Battle');
const Payment = require('./models/Payment');

// ─────────────────────────────────────────────────────────────
// BATTLE (Musobaqa) funksiyalari
// ─────────────────────────────────────────────────────────────

/**
 * Joriy faol yoki oxirgi musobaqani olish.
 * @returns {Promise<Object|null>}
 */
async function getBattle() {
  // Avval faol musobaqa, bo'lmasa oxirgi tugagan
  const battle = await Battle.findOne({ status: 'active' }).lean();
  return battle || null;
}

/**
 * Yangi musobaqa boshlash.
 * Avvalgi faol musobaqani 'finished' qilib, yangisini yaratadi.
 * @param {Array} participants
 * @returns {Promise<Object>}
 */
async function startBattle(participants) {
  // Eski faol musobaqalarni tugatamiz (xavfsizlik uchun)
  await Battle.updateMany({ status: 'active' }, { $set: { status: 'finished', endedAt: Date.now() } });

  const battle = await Battle.create({
    status:       'active',
    currentStage: 1,
    participants: participants.map(p => ({ ...p, votes: 0 })),
    startedAt:    Date.now(),
  });

  console.log(`🆕 Yangi musobaqa yaratildi: ${battle._id}`);
  return battle.toObject();
}

/**
 * Kanalda chiqarilgan post message_id sini saqlash.
 * @param {string} messageId
 */
async function setChannelMessageId(messageId) {
  await Battle.updateOne(
    { status: 'active' },
    { $set: { channelMessageId: String(messageId) } }
  );
}

/**
 * Keyingi bosqichga o'tish — g'oliblar ovozlari nollanadi.
 * @param {Array} winners - Keyingi bosqichga o'tadigan ishtirokchilar
 */
async function advanceToNextStage(winners) {
  await Battle.updateOne(
    { status: 'active' },
    {
      $inc: { currentStage: 1 },
      $set: {
        participants:     winners.map(p => ({ ...p, votes: 0 })),
        channelMessageId: null,
      },
    }
  );
}

/**
 * Musobaqani tugatish.
 */
async function endBattle() {
  await Battle.updateOne(
    { status: 'active' },
    { $set: { status: 'finished', endedAt: Date.now() } }
  );
}

/**
 * Faol musobaqani to'liq o'chirish (reset).
 * Ehtiyotkorlik bilan ishlating — tarix yo'qoladi!
 */
async function resetBattle() {
  await Battle.deleteMany({ status: 'active' });
}

// ─────────────────────────────────────────────────────────────
// OVOZ BERISH funksiyalari
// ─────────────────────────────────────────────────────────────

/**
 * Ishtirokchining ovoz sonini atomik ravishda oshirish.
 * $inc operatori race condition ni oldini oladi.
 *
 * @param {number} targetUserId
 * @param {number} amount
 * @returns {Promise<Object|null>} - Yangilangan ishtirokchi
 */
async function addVote(targetUserId, amount = 1) {
  const battle = await Battle.findOneAndUpdate(
    {
      status: 'active',
      'participants.userId': targetUserId,
    },
    {
      $inc: { 'participants.$.votes': amount },
    },
    { new: true } // Yangilangandan KEYIN qaytaradi
  ).lean();

  if (!battle) return null;

  // Yangilangan ishtirokchini topib qaytaramiz
  return battle.participants.find(p => p.userId === targetUserId) || null;
}

/**
 * Foydalanuvchi joriy bosqich ishtirokchisimi?
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
async function isParticipant(userId) {
  const count = await Battle.countDocuments({
    status: 'active',
    'participants.userId': userId,
  });
  return count > 0;
}

/**
 * Ovozlar bo'yicha kamayish tartibida ishtirokchilar.
 * @returns {Promise<Array>}
 */
async function getSortedParticipants() {
  const battle = await Battle.findOne({ status: 'active' }).lean();
  if (!battle) return [];
  return [...battle.participants].sort((a, b) => b.votes - a.votes);
}

// ─────────────────────────────────────────────────────────────
// TO'LOV TARIXI funksiyalari
// ────────��────────────────────────────────────────────────────

/**
 * Muvaffaqiyatli to'lovni bazaga yozish (audit log).
 * @param {Object} data
 * @param {string} data.chargeId        - Telegram payment charge ID
 * @param {number} data.voterId
 * @param {string} data.voterName
 * @param {number} data.targetUserId
 * @param {string} data.targetName
 * @param {number} data.amount          - XTR miqdori
 * @param {number} data.votesAdded
 * @param {string} data.invoicePayload
 * @param {number} data.stage
 * @param {string} data.battleId        - MongoDB Battle _id
 */
async function savePayment(data) {
  try {
    await Payment.create(data);
    console.log(`💾 To'lov saqlandi: ${data.chargeId}`);
  } catch (err) {
    // Duplicate chargeId — bu to'lov allaqachon saqlangan
    if (err.code === 11000) {
      console.warn(`⚠️ To'lov allaqachon saqlangan: ${data.chargeId}`);
    } else {
      console.error("❌ To'lovni saqlashda xato:", err.message);
      throw err;
    }
  }
}

/**
 * Musobaqa to'lovlari statistikasi (admin uchun foydali).
 * @param {string} battleId
 * @returns {Promise<Object>}
 */
async function getBattlePaymentStats(battleId) {
  const stats = await Payment.aggregate([
    { $match: { battleId: require('mongoose').Types.ObjectId(battleId) } },
    {
      $group: {
        _id:        '$targetUserId',
        targetName: { $first: '$targetName' },
        totalXTR:   { $sum: '$amount' },
        totalVotes: { $sum: '$votesAdded' },
        txCount:    { $sum: 1 },
      },
    },
    { $sort: { totalVotes: -1 } },
  ]);
  return stats;
}

// ─────────────────────────────────────────────────────────────
// Eksport
// ─────────────────────────────────────────────────────────────
module.exports = {
  // Battle
  getBattle,
  startBattle,
  setChannelMessageId,
  advanceToNextStage,
  endBattle,
  resetBattle,

  // Ovoz
  addVote,
  isParticipant,
  getSortedParticipants,

  // To'lov
  savePayment,
  getBattlePaymentStats,
};
