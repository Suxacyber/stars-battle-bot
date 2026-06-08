// ============================================================
// handlers/payHandlers.js — Stars to'lov (MongoDB versiyasi)
// ============================================================

const store          = require('../store');
const config         = require('../config');
const channelService = require('../utils/channelService');

// ─── PRE-CHECKOUT ─────────────────────────────────────────────
async function handlePreCheckout(ctx) {
  try {
    const query   = ctx.preCheckoutQuery;
    const payload = query.invoice_payload;
    const parts   = payload.split('_');

    // Payload format: vote_USERID_stage_N
    if (parts.length < 4 || parts[0] !== 'vote') {
      await ctx.answerPreCheckoutQuery(false, { error_message: '❌ Noto\'g\'ri to\'lov ma\'lumoti.' });
      return;
    }

    const targetUserId = parseInt(parts[1], 10);
    const stage        = parseInt(parts[3], 10);
    const battle       = await store.getBattle();

    if (!battle || battle.status !== 'active') {
      await ctx.answerPreCheckoutQuery(false, { error_message: '😔 Musobaqa tugagan.' });
      return;
    }

    if (battle.currentStage !== stage) {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: `⚠️ Musobaqa ${battle.currentStage}-bosqichga o'tdi. Kanalga qayting.`,
      });
      return;
    }

    if (!(await store.isParticipant(targetUserId))) {
      await ctx.answerPreCheckoutQuery(false, { error_message: '❌ Ishtirokchi joriy bosqichda yo\'q.' });
      return;
    }

    if (query.total_amount !== config.VOTE_COST) {
      await ctx.answerPreCheckoutQuery(false, { error_message: '❌ Noto\'g\'ri to\'lov miqdori.' });
      return;
    }

    await ctx.answerPreCheckoutQuery(true);
    console.log(`✅ [PreCheckout] ${query.from.id} → ${targetUserId} | ${query.total_amount} XTR`);

  } catch (err) {
    console.error('[handlePreCheckout] Xato:', err.message);
    try {
      await ctx.answerPreCheckoutQuery(false, { error_message: '⚠️ Server xatosi. Keyinroq urinib ko\'ring.' });
    } catch (e) { /* silent */ }
  }
}

// ─── SUCCESSFUL PAYMENT ───────────────────────────────────────
async function handleSuccessfulPayment(ctx) {
  try {
    const payment  = ctx.message.successful_payment;
    const payload  = payment.invoice_payload;
    const voter    = ctx.from;
    const parts    = payload.split('_');

    const targetUserId = parseInt(parts[1], 10);
    const stage        = parseInt(parts[3], 10);
    const paidAmount   = payment.total_amount;
    const chargeId     = payment.telegram_payment_charge_id;

    console.log(`💳 [Payment] voter=${voter.id} → target=${targetUserId} | ${paidAmount} XTR | ${chargeId}`);

    // ─── Musobaqa holati nazorati ─────────────────────────────
    const battle = await store.getBattle();
    if (!battle || battle.status !== 'active' || battle.currentStage !== stage) {
      await ctx.reply(
        `⚠️ To'lov qabul qilindi, lekin musobaqa holati o'zgargan.\n` +
        `Charge ID: \`${chargeId}\`\nAdmin bilan bog'laning.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ─── Ovozni atomik qo'shish ($inc) ───────────────────────
    const votesAdded  = Math.floor(paidAmount / config.VOTE_COST);
    const participant = await store.addVote(targetUserId, votesAdded);

    if (!participant) {
      await ctx.reply(
        `❌ Ishtirokchi topilmadi.\nCharge ID: \`${chargeId}\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ─── To'lovni audit log ga yozish ────────────────────────
    await store.savePayment({
      chargeId,
      voterId:      voter.id,
      voterName:    voter.first_name || String(voter.id),
      targetUserId,
      targetName:   participant.firstName,
      amount:       paidAmount,
      votesAdded,
      invoicePayload: payload,
      stage,
      battleId:     battle._id,
    });

    // ─── Foydalanuvchiga tasdiqlash ───────────────────────────
    await ctx.reply(
      `✅ *To'lov qabul qilindi!*\n\n` +
      `⭐️ *${participant.firstName}* ga ${votesAdded} ovoz qo'shildi.\n` +
      `📊 Jami: *${participant.votes}* ⭐️\n\n` +
      `🔢 Charge ID: \`${chargeId}\``,
      { parse_mode: 'Markdown' }
    );

    // ─── Kanaldagi postni jonli yangilash ────────────────────
    const updatedBattle = await store.getBattle();
    channelService.updateStagePost(ctx.telegram, updatedBattle)
      .catch(err => console.error('[Payment] Post yangilash xatosi:', err.message));

    // ─── Final avtomatik g'olib tekshiruvi ───────────────────
    if (stage === 3 && participant.votes >= config.STAGE_LIMITS[3]) {
      await store.endBattle();
      await channelService.sendWinnerPost(ctx.telegram, participant, 3);
      await ctx.telegram.sendMessage(
        config.ADMIN_ID,
        `🏆 *Grand Final yakunlandi!*\nG'OLIB: *${participant.firstName}*\n⭐️ ${participant.votes} ovoz`,
        { parse_mode: 'Markdown' }
      ).catch(e => console.error('[Payment] Admin xabar xatosi:', e.message));
    }

  } catch (err) {
    console.error('[handleSuccessfulPayment] Xato:', err.message);
    await ctx.reply('⚠️ To\'lov o\'tdi, lekin xatolik yuz berdi. Admin bilan bog\'laning.').catch(() => {});
  }
}

module.exports = { handlePreCheckout, handleSuccessfulPayment };

