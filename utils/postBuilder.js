// ============================================================
// utils/postBuilder.js — Kanal postlari matnini yaratuvchi
// ============================================================
// Barcha post formatlari shu joyda markazlashtirilgan.
// Yangi dizayn kerak bo'lsa — faqat shu faylni o'zgartiring.
// ============================================================

const config = require('../config');

/**
 * Foydalanuvchi ismini profil havolasi sifatida formatlash
 * tg://user?id=  — Telegram ilovasida profilga o'tadi
 * @param {Object} participant
 * @returns {string}
 */
function userLink(participant) {
  const name = escapeMarkdown(participant.firstName || 'Noma\'lum');
  return `[${name}](tg://user?id=${participant.userId})`;
}

/**
 * Markdown maxsus belgilarni escape qilish (MarkdownV1 uchun)
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Progress bar yaratish (vizual ko'rinish uchun)
 * @param {number} votes   - Hozirgi ovozlar
 * @param {number} max     - Maksimal ovozlar (eng ko'p olgan)
 * @param {number} limit   - Bosqich limiti
 * @returns {string}
 */
function buildProgressBar(votes, max, limit) {
  const BAR_LENGTH = 10;
  const filled = max > 0 ? Math.round((votes / Math.max(max, limit)) * BAR_LENGTH) : 0;
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_LENGTH - filled);
  const pct = max > 0 ? Math.round((votes / Math.max(max, limit)) * 100) : 0;
  return `\`[${bar}]\` ${pct}%`;
}

/**
 * Bosqich 1 (Saralash) yoki 2 (Yarim final) uchun post matni
 * @param {Object} battle     - battleState
 * @param {string} botUsername
 * @returns {{ text: string, keyboard: Object }}
 */
function buildActiveStagePost(battle, botUsername) {
  const { currentStage, participants } = battle;
  const limit  = config.STAGE_LIMITS[currentStage];
  const title  = config.STAGE_NAMES[currentStage];

  // Eng ko'p ovozni aniqlash (progress bar uchun)
  const maxVotes = Math.max(...participants.map(p => p.votes), 0);

  // Ishtirokchilar ro'yxati
  const medals = ['🥇', '🥈', '🥉'];
  const sorted = [...participants].sort((a, b) => b.votes - a.votes);

  const lines = sorted.map((p, i) => {
    const bar      = buildProgressBar(p.votes, maxVotes, limit);
    const linkText = userLink(p);
    const medal    = medals[i] || '▪️';
    return `${medal} ${linkText}\n   ⭐️ *${p.votes}* ovoz ${bar}`;
  });

  const text =
    `╔══════════════════════╗\n` +
    `   ${title}\n` +
    `╚══════════════════════╝\n\n` +
    `${lines.join('\n\n')}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 *Keyingi bosqichga o'tish uchun minimal:* ${limit} ⭐️\n` +
    `💡 Sevimli ishtirokchingizga ovoz bering!`;

  // Inline tugmalar — botga deep-link orqali yo'naltiradi
  const keyboard = {
    inline_keyboard: sorted.map(p => ([{
      text: `⭐️ ${p.firstName} ga ovoz — ${p.votes} ⭐️`,
      url:  `https://t.me/${botUsername}?start=vote_${p.userId}`,
    }])),
  };

  return { text, keyboard };
}

/**
 * Grand Final (3-bosqich) posti
 * @param {Object} finalist   - Yagona finalist
 * @param {string} botUsername
 * @returns {{ text: string, keyboard: Object }}
 */
function buildFinalStagePost(finalist, botUsername) {
  const limit = config.STAGE_LIMITS[3];

  const text =
    `╔══════════════════════╗\n` +
    `   👑 GRAND FINAL 👑\n` +
    `╚══════════════════════╝\n\n` +
    `💎 Finalist: ${userLink(finalist)}\n\n` +
    `⭐️ *To'plangan:* ${finalist.votes} ovoz\n` +
    `🏆 *Maqsad:* ${limit} ⭐️\n\n` +
    `${buildProgressBar(finalist.votes, limit, limit)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👆 Finalistga qo'llab-quvvatlang va uni G'OLIB qiling!`;

  const keyboard = {
    inline_keyboard: [[{
      text: `⭐️ ${finalist.firstName} ni qo'llash — ${finalist.votes} ⭐️`,
      url:  `https://t.me/${botUsername}?start=vote_${finalist.userId}`,
    }]],
  };

  return { text, keyboard };
}

/**
 * G'olib e'loni posti
 * @param {Object} winner
 * @param {number} stage
 * @returns {string}
 */
function buildWinnerPost(winner, stage) {
  return (
    `🎉🎉🎉 *G'OLIB E'LON QILINDI!* 🎉🎉🎉\n\n` +
    `╔══════════════════════╗\n` +
    `   🏆 MUSOBAQA YAKUNLANDI\n` +
    `╚══════════════════════╝\n\n` +
    `👑 *Mutloq G'olib:* ${userLink(winner)}\n` +
    `⭐️ *Jami ovozlar:* ${winner.votes}\n\n` +
    `Tabriklaymiz! Ajoyib natija! 🥳`
  );
}

/**
 * Minimal limit yetmaganida avtomatik to'xtatish posti
 * @param {number} stage
 * @param {number} limit
 * @returns {string}
 */
function buildAutoStopPost(stage, limit) {
  return (
    `⛔️ *MUSOBAQA TO'XTATILDI*\n\n` +
    `╔══════════════════════╗\n` +
    `   ${config.STAGE_NAMES[stage]}\n` +
    `╚══════════════════════╝\n\n` +
    `😔 Afsuski, hech bir ishtirokchi ${stage}-bosqich\n` +
    `minimal chegarasidan (${limit} ⭐️) o'ta olmadi.\n\n` +
    `📌 Musobaqa qoidalariga ko'ra:\n` +
    `_Yig'ilgan barcha Stars bot egasida qoladi._\n\n` +
    `🔄 Yangi musobaqa tez orada boshlanadi!`
  );
}

module.exports = {
  buildActiveStagePost,
  buildFinalStagePost,
  buildWinnerPost,
  buildAutoStopPost,
  userLink,
};

