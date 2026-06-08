// Payment model for transactions
class Payment {
  constructor() {
    this.payments = [];
  }

  create(userId, amount, type = 'deposit') {
    const payment = {
      id: Date.now(),
      userId,
      amount,
      type, // 'deposit' or 'withdraw'
      status: 'pending',
      createdAt: new Date()
    };
    this.payments.push(payment);
    return payment;
  }

  confirm(paymentId) {
    const payment = this.payments.find(p => p.id === paymentId);
    if (payment) {
      payment.status = 'completed';
    }
    return payment;
  }

  getByUserId(userId) {
    return this.payments.filter(p => p.userId === userId);
  }
}

module.exports = new Payment();
