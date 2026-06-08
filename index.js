// ============================================================
// index.js — Asosiy kirish nuqtasi (MongoDB versiyasi)
// ============================================================
require('dotenv').config();

const { Telegraf } = require('telegraf');
const { message }  = require('telegraf/filters');

const config        = require('./config');
const { connectDB, disconnectDB } = require('./store/db');
const adminHandlers = require('./handlers/adminHandlers');
const voteHandlers  = require('./handlers/voteHandlers');
const payHandlers   = require('./handlers/payHandlers');

const bot = new Telegraf(config.BOT_TOKEN);

// ─── Middleware: log ──────────────────────────────────────────
bot.use(async (ctx, next) => {
  const user = ctx.from ? `@${ctx.from.username || ctx.from.id}` : 'unknown';
  console.log(`[${new Date().toISOString()}] ${ctx.updateType} | ${user}`);
  return next();
});

// ─── /start ──────────────────────────────────────────────────
bot.start(async (ctx) => {
  const payload = ctx.startPayload;

  if (payload && payload.startsWith('vote_')) {
    const targetId = parseInt(payload.split('_')[1], 10);
    await voteHandlers.handleVoteStart(ctx, targetId);
    return;
  }

  if (ctx.from.id === config.ADMIN_ID) {
    await adminHandlers.showAdminPanel(ctx);
    return;
  }

  await ctx.reply(
    '👋 *Xush kelibsiz!*\n\nKanal postlaridagi tugmalarni bosib, ' +
    'sevimli ishtirokchingizga ⭐️ Stars bilan ovoz bering!',
    { parse_mode: 'Markdown' }
  );
});

// ─── Admin callback'lar ───────────────────────────────────────
bot.action('admin_start_battle', adminHandlers.startBattle);
bot.action('admin_next_stage',   adminHandlers.nextStage);
bot.action('admin_force_stop',   adminHandlers.forceStop);
bot.action('admin_panel',        adminHandlers.showAdminPanel);

// ─── To'lov hodisalari ────────────────────────────────────────
bot.on('pre_checkout_query',          payHandlers.handlePreCheckout);
bot.on(message('successful_payment'), payHandlers.handleSuccessfulPayment);

// ─── Xato tutgich ─────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error(`[BOT ERROR] ${ctx.updateType}:`, err.message);
});

// ─── Ishga tushirish: avval DB, keyin bot ────────────────────
async function main() {
  await connectDB();       // MongoDB ulangach
  await bot.launch();      // Bot ishga tushadi
  console.log('✅ Stars Battle Bot ishga tushdi!');
}

main().catch((err) => {
  console.error('❌ Ishga tushishda xato:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT',  async () => { bot.stop('SIGINT');  await disconnectDB(); });
process.once('SIGTERM', async () => { bot.stop('SIGTERM'); await disconnectDB(); });
