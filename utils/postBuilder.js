// Build and format Telegram posts
const postBuilder = {
  battlePost: (star1, star2, votes1 = 0, votes2 = 0) => {
    return `⭐ BATTLE ⭐\n\n${star1} vs ${star2}\n\n👍 ${votes1} votes\n👍 ${votes2} votes`;
  },

  resultPost: (winner, loser) => {
    return `🎉 WINNER: ${winner}\n😢 LOSER: ${loser}`;
  },

  leaderboardPost: (topStars) => {
    let text = '🏆 LEADERBOARD 🏆\n\n';
    topStars.forEach((star, index) => {
      text += `${index + 1}. ${star.name} - ${star.points} points\n`;
    });
    return text;
  },

  balancePost: (userId, balance) => {
    return `💰 Balance\n\nUser: ${userId}\nBalance: ${balance}`;
  }
};

module.exports = postBuilder;
