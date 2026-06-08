
// ============================================================
// handlers/voteHandlers.js — Ovoz berish (MongoDB versiyasi)
// ============================================================

const config = require('../config');
const store  = require('../store');

async function handleVoteStart(ctx, targetId) {
  try {
    const battle = await store.getBattle();

    if (!battle || battle.status !== 'active') {
      await ctx.reply('😔 Hozirda faol musobaqa mavjud emas.');
      return;
    }

    if (!(await store.isParticipant(targetId))) {
      await ctx.reply('❌ Bu foydalanuvchi joriy bosqich ishtirokchisi emas.');
      return;
    }

    if (ctx.from.id === targetId) {
      await ctx.reply('🚫 O\'zingizga ovoz bera olmaysiz!');
      return;
    }

    const target = battle.participants.find(p => p.userId === targetId);
    await sendVoteInvoice(ctx, target, battle.currentStage);

  } catch (err) {
    console.error('[handleVoteStart] Xato:', err.message);
    await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.').catch(() => {});
  }
}

async function sendVoteInvoice(ctx, target, stage) {
  try {
    await ctx.replyWithInvoice({
      title:          `${config.INVOICE_TITLE} — ${target.firstName}`,
      description:
        `${config.STAGE_NAMES[stage]}\n\n` +
        `Siz *${target.firstName}* ga ⭐️ ${config.VOTE_COST} Stars evaziga ovoz beryapsiz.`,
      payload:        `vote_${target.userId}_stage_${stage}`,
      provider_token: '', // Stars uchun bo'sh
      currency:       'XTR',
      prices: [{
        label:  `⭐️ ${target.firstName} ga 1 ovoz`,
        amount: config.VOTE_COST,
      }],
      need_name:   false,
      need_email:  false,
      need_phone:  false,
      is_flexible: false,
    });

    console.log(`📄 Invoice: ${ctx.from.id} → ${target.userId} | ${config.VOTE_COST} XTR | Bosqich: ${stage}`);
  } catch (err) {
    console.error('[sendVoteInvoice] Xato:', err.message);
    await ctx.reply('❌ Invoice yuborishda xatolik. Keyinroq urinib ko\'ring.').catch(() => {});
  }
}

module.exports = { handleVoteStart, sendVoteInvoice };
