// Battle model for star battles
class Battle {
  constructor() {
    this.battles = [];
  }

  create(star1Id, star2Id) {
    const battle = {
      id: Date.now(),
      star1Id,
      star2Id,
      star1Votes: 0,
      star2Votes: 0,
      createdAt: new Date(),
      status: 'active'
    };
    this.battles.push(battle);
    return battle;
  }

  vote(battleId, starId) {
    const battle = this.battles.find(b => b.id === battleId);
    if (battle) {
      if (battle.star1Id === starId) {
        battle.star1Votes++;
      } else if (battle.star2Id === starId) {
        battle.star2Votes++;
      }
    }
    return battle;
  }

  getById(battleId) {
    return this.battles.find(b => b.id === battleId);
  }
}

module.exports = new Battle();
