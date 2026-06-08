// ============================================================
// utils/channelService.js — Kanal bilan ishlash funksiyalari
// ============================================================

const config      = require('../config');
const store       = require('../store');
const postBuilder = require('./postBuilder');

/**
 * Botning username ini olish (bir marta o'qib keshlaymiz)
 * @param {import('telegraf').Telegraf} telegram
 */
let _botUsername = null;
async function getBotUsername(telegram) {
  if (!_botUsername) {
    const me = await telegram.getMe();
    _botUsername = me.username;
  }
  return _botUsername;
}

/**
 * Kanalga yangi bosqich postini yuborish
 * @param {import('telegraf').Telegraf} telegram
 * @param {Object} battle - battleState
 */
async function sendStagePost(telegram, battle) {
  const botUsername = await getBotUsername(telegram);
  let text, keyboard;

  if (battle.currentStage === 3) {
    // Grand final — yagona finalist
    const finalist = battle.participants[0];
    ({ text, keyboard } = postBuilder.buildFinalStagePost(finalist, botUsername));
  } else {
    ({ text, keyboard } = postBuilder.buildActiveStagePost(battle, botUsername));
  }

  try {
    const msg = await telegram.sendMessage(config.CHANNEL_ID, text, {
      parse_mode:   'Markdown',
      reply_markup: keyboard,
    });
    // Post ID ni saqlaymiz — keyinchalik edit qilish uchun
    store.setChannelMessageId(msg.message_id);
    console.log(`✅ Kanal posti yuborildi. message_id: ${msg.message_id}`);
    return msg;
  } catch (err) {
    console.error('❌ Kanal postini yuborishda xato:', err.message);
    throw err;
  }
}

/**
 * Kanaldagi mavjud postni jonli yangilash (Live update)
 * @param {import('telegraf').Telegraf} telegram
 * @param {Object} battle
 */
async function updateStagePost(telegram, battle) {
  const { channelMessageId, currentStage } = battle;
  if (!channelMessageId) {
    console.warn('⚠️ channelMessageId mavjud emas, post yangilanmaydi.');
    return;
  }

  const botUsername = await getBotUsername(telegram);
  let text, keyboard;

  if (currentStage === 3) {
    const finalist = battle.participants[0];
    ({ text, keyboard } = postBuilder.buildFinalStagePost(finalist, botUsername));
  } else {
    ({ text, keyboard } = postBuilder.buildActiveStagePost(battle, botUsername));
  }

  try {
    await telegram.editMessageText(config.CHANNEL_ID, channelMessageId, null, text, {
      parse_mode:   'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    // "message is not modified" xatosi botni o'chirmasligi kerak
    if (err.description && err.description.includes('message is not modified')) {
      console.log('ℹ️ Post o\'zgartirilmadi (xuddi shunday matn).');
    } else {
      console.error('❌ Post yangilashda xato:', err.message);
    }
  }
}

/**
 * Kanaldagi postni g'olib e'loni bilan almashtirish
 * @param {import('telegraf').Telegraf} telegram
 * @param {Object} winner
 * @param {number} stage
 */
async function sendWinnerPost(telegram, winner, stage) {
  const { channelMessageId } = store.getBattle();
  const text = postBuilder.buildWinnerPost(winner, stage);

  try {
    if (channelMessageId) {
      // Mavjud postni g'olib ma'lumoti bilan yangilaymiz
      await telegram.editMessageText(config.CHANNEL_ID, channelMessageId, null, text, {
        parse_mode: 'Markdown',
      });
    } else {
      await telegram.sendMessage(config.CHANNEL_ID, text, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error('❌ G\'olib postini yuborishda xato:', err.message);
  }
}

/**
 * Musobaqa to'xtatildi postini yuborish
 * @param {import('telegraf').Telegraf} telegram
 * @param {number} stage
 * @param {number} limit
 */
async function sendAutoStopPost(telegram, stage, limit) {
  const { channelMessageId } = store.getBattle();
  const text = postBuilder.buildAutoStopPost(stage, limit);

  try {
    if (channelMessageId) {
      await telegram.editMessageText(config.CHANNEL_ID, channelMessageId, null, text, {
        parse_mode: 'Markdown',
      });
    } else {
      await telegram.sendMessage(config.CHANNEL_ID, text, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error('❌ To\'xtatish postini yuborishda xato:', err.message);
  }
}

module.exports = {
  sendStagePost,
  updateStagePost,
  sendWinnerPost,
  sendAutoStopPost,
};

