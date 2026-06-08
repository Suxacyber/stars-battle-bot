// ============================================================
// config.js — Barcha sozlamalar markazlashtirilgan joyda
// ============================================================

const config = {
  // ─── Telegram sozlamalari ──────────────────────────────────
  BOT_TOKEN:  process.env.BOT_TOKEN,
  ADMIN_ID:   parseInt(process.env.ADMIN_ID, 10),
  CHANNEL_ID: process.env.CHANNEL_ID, // masalan: '@mybattlechannel' yoki '-1001234567890'

  // ─── Bosqich limitlari (minimal Stars miqdori) ─────────────
  STAGE_LIMITS: {
    1: 50,   // Saralash: har bir g'olib kamida 50 ⭐️ to'plashi shart
    2: 150,  // Yarim final: kamida 150 ⭐️
    3: 300,  // Final: mutloq g'olib bo'lish uchun 300 ⭐️
  },

  // ─── Invoice narxi (1 ovoz = necha Stars) ──────────────────
  VOTE_COST: parseInt(process.env.VOTE_COST, 10) || 1, // XTR da

  // ─── Invoice matnlari ──────────────────────────────────────
  INVOICE_TITLE:       '⭐️ Ovoz berish',
  INVOICE_DESCRIPTION: 'Siz tanlagan ishtirokchiga 1 ovoz (⭐️) beryapsiz.',

  // ─── Bosqich nomlari ──────────────────────────────────────
  STAGE_NAMES: {
    1: '⚔️ 1-Bosqich: Saralash',
    2: '🥊 2-Bosqich: Yarim Final',
    3: '👑 3-Bosqich: GRAND FINAL',
  },

  // ─── Bosqichdagi maksimal ishtirokchilar soni ──────────────
  STAGE_PARTICIPANTS: {
    1: 3, // 3 ta o'ynaydi, 2 tasi o'tadi
    2: 2, // 2 ta o'ynaydi, 1 tasi o'tadi
    3: 1, // 1 ta finalist
  },
};

// Muhim tokenlar tekshiruvi
if (!config.BOT_TOKEN)  throw new Error('❌ BOT_TOKEN .env faylida mavjud emas!');
if (!config.ADMIN_ID)   throw new Error('❌ ADMIN_ID .env faylida mavjud emas!');
if (!config.CHANNEL_ID) throw new Error('❌ CHANNEL_ID .env faylida mavjud emas!');

module.exports = config;
