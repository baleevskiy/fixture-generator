import _ from "lodash";

interface NumberMap {
  [key: number]: number;
}
class Team {
  public homeGames: number = 0;
  public awayGames: number = 0;
  public playedTo: Team[] = [];
  public teamId: number;

  constructor(teamId: number) {
    this.teamId = teamId;
  }

  canPlayTo(team: Team) {
    return !_.includes(this.playedTo, team);
  }

  get gamesPlayed() {
    return this.homeGames + this.awayGames;
  }

  get homePlayFactor() {
    return this.awayGames - this.homeGames;
  }

  toString() {
    return `${this.teamId}`;
  }
}

class Game {
  public awayTeam: Team;
  public homeTeam: Team;
  public slotId: number;

  constructor(homeTeam: Team, awayTeam: Team, slotId: number = 0) {
    this.awayTeam = awayTeam;
    this.homeTeam = homeTeam;
    this.homeTeam.homeGames += 1;
    this.awayTeam.awayGames += 1;
    this.homeTeam.playedTo.push(this.awayTeam);
    this.awayTeam.playedTo.push(this.homeTeam);
    this.slotId = slotId;
  }

  get teams() {
    return [this.homeTeam, this.awayTeam];
  }

  get teamIds() {
    return _.map(this.teams, "teamId");
  }

  toString() {
    return `(${this.homeTeam.toString()} ${this.awayTeam.toString()})`;
  }
}

class Round {
  public games: Game[] = [];

  get teamsPlayed() {
    return _.uniq(_.flattenDeep(this.games.map((game) => game.teams)));
  }

  get numGames() {
    return _.size(this.games);
  }

  addGame(game: Game) {
    this.games.push(game);
    return this;
  }

  toString() {
    return this.games.map((game) => game.toString()).join(" ");
  }

  get isEmpty(): boolean {
    return this.numGames === 0;
  }

  get teamIds() {
    return _.map(this.games, "teamIds");
  }
}

class Cycle {
  public rounds: Round[] = [];
  public teams: Team[] = [];
  public games: Game[] = [];
  public slots: number;
  public bufferRound: Round;

  constructor(slots: number) {
    this.slots = slots;
    this.bufferRound = new Round();
  }

  toString() {
    return this.rounds.map((round) => round.toString()).join("\r\n");
  }

  get teamIds() {
    return _.map(this.rounds, "teamIds");
  }

  get slotsByTeamId(): NumberMap {
    return { 1: 4 };
  }

  get currentRound(): Round {
    if (
      _.isEmpty(this.rounds) ||
      _.last(this.rounds)?.numGames === this.slots
    ) {
      const gamesFromBuffer = this.bufferRound.games.slice(0, this.slots);
      this.bufferRound.games = this.bufferRound.games.slice(this.slots);

      const nextRound = new Round();
      nextRound.games = gamesFromBuffer;
      this.rounds.push(nextRound);
    }
    return _.last(this.rounds)!;
  }

  getOpponentFor(team: Team): Team | undefined {
    const opponent = _(this.teams)
      .difference(this.currentRound.teamsPlayed)
      .difference([team])
      .difference(team.playedTo)
      .sortBy((team) => team.gamesPlayed)
      .head();

    return opponent;
  }

  get teamLessPlayed(): Team | undefined {
    const lessPlayedTeam = _(this.teams)
      .difference(this.currentRound.teamsPlayed)
      .filter((team) => !_.isUndefined(this.getOpponentFor(team)))
      .sortBy((team) => `${team.gamesPlayed}_${Math.random()}`)
      .head();
    //console.log("less played team", lessPlayedTeam);

    return lessPlayedTeam;
  }

  addGame(game: Game) {
    this.games.push(game);
    this.currentRound.addGame(game);
    return this;
  }

  get numGames() {
    return _.size(this.games);
  }
}

type Fixture = Round[];

export class FixtureBuilder {
  public rounds = [];
  public cycle: Cycle;

  constructor() {
    this.cycle = new Cycle(0);
  }

  generateFixture(teamNumber: number, slotNumber: number): Cycle {
    if (slotNumber > teamNumber / 2) {
      throw new Error(
        `slotNumber cannot be larger than half team number ${teamNumber} < ${slotNumber}`
      );
    }

    if (slotNumber < 1) {
      return this.cycle;
    }

    this.cycle.slots = slotNumber;
    this.cycle.teams = this.makeTeams(teamNumber);
    while (this.cycle.numGames < (teamNumber * (teamNumber - 1)) / 2) {
      this.scheduleNextGame();
    }
    return this.cycle;
  }

  addRound(round: Round) {}

  makeTeams(teamNumber: number) {
    return _.times(teamNumber, (id) => new Team(id + 1));
  }

  scheduleNextGame(): boolean {
    const teamLessPlayed = this.cycle.teamLessPlayed;
    if (_.isUndefined(teamLessPlayed)) {
      this.cycle.addGame(new Game(new Team(-1), new Team(-1)));
      return false;
    }
    const opponent = this.cycle.getOpponentFor(teamLessPlayed);

    const [awayTeam, homeTeam] = _.sortBy(
      [teamLessPlayed, opponent],
      "homePlayFactor"
    );
    this.cycle.addGame(new Game(homeTeam!, awayTeam!));

    return true;
  }
}
