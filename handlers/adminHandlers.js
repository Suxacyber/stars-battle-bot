// ============================================================
// handlers/adminHandlers.js — Admin panel (MongoDB versiyasi)
// ============================================================

const config         = require('../config');
const store          = require('../store');
const channelService = require('../utils/channelService');

// ─── Faqat admin o'ta oladi ───────────────────────────────────
function adminOnly(ctx) {
  if (ctx.from.id !== config.ADMIN_ID) {
    ctx.answerCbQuery('❌ Sizda bu amalni bajarish huquqi yo\'q!', { show_alert: true }).catch(() => {});
    return false;
  }
  return true;
}

// ─── Admin menyusini ko'rsatish ───────────────────────────────
async function showAdminPanel(ctx) {
  try {
    const battle   = await store.getBattle();
    const isActive = battle && battle.status === 'active';

    const statusText = isActive
      ? `🟢 *Faol musobaqa:* ${config.STAGE_NAMES[battle.currentStage]}\n` +
        `👥 Ishtirokchilar: ${battle.participants.length} ta`
      : '🔴 Hozirda faol musobaqa yo\'q';

    const text = `👨‍💼 *Admin Panel*\n\n${statusText}`;
    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Batlni boshlash (1-bosqich)', callback_data: 'admin_start_battle' }],
        [{ text: '⏭ Keyingi bosqich',              callback_data: 'admin_next_stage'   }],
        [{ text: '❌ Batlni majburiy to\'xtatish',  callback_data: 'admin_force_stop'   }],
      ],
    };

    const opts = { parse_mode: 'Markdown', reply_markup: keyboard };

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, opts);
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(text, opts);
    }
  } catch (err) {
    console.error('[showAdminPanel] Xato:', err.message);
  }
}

// ─── Batlni boshlash ──────────────────────────────────────────
async function startBattle(ctx) {
  if (!adminOnly(ctx)) return;

  try {
    const existing = await store.getBattle();
    if (existing && existing.status === 'active') {
      await ctx.answerCbQuery('⚠️ Musobaqa allaqachon faol!', { show_alert: true });
      return;
    }

    // ── NAMUNA ishtirokchilar — o'zingizning ro'yxatingiz bilan almashtiring ──
    const participants = [
      { userId: 111111111, firstName: 'Alisher', username: 'alisher_uz' },
      { userId: 222222222, firstName: 'Barno',   username: 'barno_uz'   },
      { userId: 333333333, firstName: 'Jasur',   username: 'jasur_uz'   },
    ];
    // ─────────────────────────────────────────────────────────────────────────

    const newBattle = await store.startBattle(participants);
    await channelService.sendStagePost(ctx.telegram, newBattle);

    await ctx.answerCbQuery('✅ 1-bosqich posti kanalga yuborildi!');
    await showAdminPanel(ctx);
    console.log(`🚀 Admin ${ctx.from.id} musobaqani boshladi. Battle ID: ${newBattle._id}`);
  } catch (err) {
    console.error('[startBattle] Xato:', err.message);
    await ctx.answerCbQuery('❌ Xato yuz berdi.', { show_alert: true });
  }
}

// ─── Keyingi bosqichga o'tish ─────────────────────────────────
async function nextStage(ctx) {
  if (!adminOnly(ctx)) return;

  try {
    const battle = await store.getBattle();

    if (!battle || battle.status !== 'active') {
      await ctx.answerCbQuery('❌ Faol musobaqa mavjud emas!', { show_alert: true });
      return;
    }

    const stage  = battle.currentStage;
    const limit  = config.STAGE_LIMITS[stage];
    const sorted = [...battle.participants].sort((a, b) => b.votes - a.votes);
    const top    = sorted[0];

    // ─── Limit tekshiruvi ──────────────────────────────────────
    if (!top || top.votes < limit) {
      console.log(`⛔️ ${stage}-bosqich limiti (${limit}) yetmadi. To'xtatildi.`);
      await store.endBattle();
      await channelService.sendAutoStopPost(ctx.telegram, stage, limit);
      await ctx.answerCbQuery('⛔️ Limit yetmadi! Musobaqa to\'xtatildi.', { show_alert: true });
      await showAdminPanel(ctx);
      return;
    }

    // ─── Final (3-bosqich) tugadimi? ──────────────────────────
    if (stage === 3) {
      if (top.votes >= limit) {
        await store.endBattle();
        await channelService.sendWinnerPost(ctx.telegram, top, stage);
        await ctx.answerCbQuery(`🏆 G'OLIB: ${top.firstName}!`, { show_alert: true });
        await showAdminPanel(ctx);
      } else {
        await ctx.answerCbQuery('⏳ Final hali tugamagan.', { show_alert: true });
      }
      return;
    }

    // ─── Keyingi bosqichga o'tish ─────────────────────────────
    const nextStageNum  = stage + 1;
    const winnersCount  = config.STAGE_PARTICIPANTS[nextStageNum];
    const qualified     = sorted.filter(p => p.votes >= limit).slice(0, winnersCount);

    if (qualified.length < winnersCount) {
      await store.endBattle();
      await channelService.sendAutoStopPost(ctx.telegram, stage, limit);
      await ctx.answerCbQuery('⛔️ Yetarli g\'olib yo\'q. To\'xtatildi.', { show_alert: true });
      await showAdminPanel(ctx);
      return;
    }

    await store.advanceToNextStage(qualified);
    const updated = await store.getBattle();
    await channelService.sendStagePost(ctx.telegram, updated);

    await ctx.answerCbQuery(`✅ ${config.STAGE_NAMES[nextStageNum]} boshlandi!`);
    await showAdminPanel(ctx);
    console.log(`⏭ ${stage} → ${nextStageNum}-bosqich. Admin: ${ctx.from.id}`);
  } catch (err) {
    console.error('[nextStage] Xato:', err.message);
    await ctx.answerCbQuery('❌ Xato yuz berdi.', { show_alert: true });
  }
}

// ─── Majburiy to'xtatish ──────────────────────────────────────
async function forceStop(ctx) {
  if (!adminOnly(ctx)) return;

  try {
    const battle = await store.getBattle();
    if (!battle || battle.status !== 'active') {
      await ctx.answerCbQuery('❌ Faol musobaqa mavjud emas!', { show_alert: true });
      return;
    }

    await store.endBattle();
    await channelService.sendAutoStopPost(ctx.telegram, battle.currentStage, 0);
    await ctx.answerCbQuery('🛑 Musobaqa to\'xtatildi.');
    await showAdminPanel(ctx);
    console.log(`🛑 Admin ${ctx.from.id} majburiy to'xtatdi.`);
  } catch (err) {
    console.error('[forceStop] Xato:', err.message);
    await ctx.answerCbQuery('❌ Xato yuz berdi.', { show_alert: true });
  }
}

module.exports = { showAdminPanel, startBattle, nextStage, forceStop };

