// ============================================================
// store/db.js — MongoDB ulanish moduli
// ============================================================

const mongoose = require('mongoose');

/**
 * MongoDB ga ulanish.
 * Bot ishga tushishidan OLDIN chaqirilishi shart (index.js da).
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('❌ MONGODB_URI .env faylida mavjud emas!');
  }

  try {
    await mongoose.connect(uri, {
      // Mongoose 7+ da bu parametrlar default, lekin aniqlik uchun yozildi
      serverSelectionTimeoutMS: 5000,  // 5 sek ichida ulanmasa xato
      socketTimeoutMS:          45000, // 45 sek so'rov timeout
    });

    console.log('✅ MongoDB ga muvaffaqiyatli ulandi!');

    // Ulanish hodisalarini kuzatish
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB ulanishi uzildi. Qayta ulanish...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB ga qayta ulandi.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB xatosi:', err.message);
    });

  } catch (err) {
    console.error('❌ MongoDB ga ulanib bo\'lmadi:', err.message);
    process.exit(1); // DB siz bot ishlay olmaydi
  }
}

/**
 * MongoDB ulanishini yopish (graceful shutdown uchun)
 */
async function disconnectDB() {
  await mongoose.connection.close();
  console.log('🔌 MongoDB ulanishi yopildi.');
}

module.exports = { connectDB, disconnectDB };
