import _ from "lodash";

interface NumberMap<T> {
  [key: number]: T;
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

class GameCounter {
  public gameCountBySlotByTeam: NumberMap<NumberMap<number>>;
  protected slotNumber: number;

  constructor(slotNumber: number) {
    this.gameCountBySlotByTeam = {};
    this.slotNumber = slotNumber;
  }

  public makeCounterForTeam(team: Team) {
    this.gameCountBySlotByTeam[team.teamId] = _.mapValues(
      _.mapKeys(_.range(this.slotNumber)),
      () => 0
    );
    return this.gameCountBySlotByTeam[team.teamId];
  }

  public getPlayed(team: Team): NumberMap<number> {
    return (
      this.gameCountBySlotByTeam[team.teamId] || this.makeCounterForTeam(team)
    );
  }

  public maxPlayedSlotGames(team: Team): number {
    return _.max(_.values(this.getPlayed(team)))!;
  }

  public minPlayedSlotGames(team: Team): number {
    return _.min(_.values(this.getPlayed(team)))!;
  }

  public getSpreadInPlayedSlots(team: Team): number {
    return this.maxPlayedSlotGames(team) - this.minPlayedSlotGames(team);
  }

  public play(team: Team, slot: number) {
    this.getPlayed(team)[slot] += 1;
    return this;
  }

  public getNextSlotFor(teamA: Team, teamB: Team, round: Round): number {
    const [maxSpreadSlotsForA, maxSpreadSlotsForB] = _.map(
      [teamA, teamB],
      (team) => this.getSpreadInPlayedSlots(team)
    );

    const teamChoosesTheSlot =
      maxSpreadSlotsForA! > maxSpreadSlotsForB! ? teamA : teamB;
    const teamPlayed = this.getPlayed(teamChoosesTheSlot);

    return _.minBy(round.emptySlots, (slotId) => teamPlayed[slotId]) as number;
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
    return `(${_(this.teamIds)
      .map((id) => _.padStart(id.toString(), 2))
      .join(" ")})`;
  }

  get isFake() {
    return this.homeTeam.teamId === -1 || this.awayTeam.teamId === -1;
  }
}

class Round {
  public games: Game[] = [];
  public cycle: Cycle;

  constructor(cycle: Cycle) {
    this.cycle = cycle;
  }

  get teamsPlayed() {
    return _.uniq(_.flattenDeep(this.games.map((game) => game.teams)));
  }

  get numGames() {
    return _.size(this.games);
  }

  get emptySlots() {
    return _.difference(_.range(this.cycle.slots), _.map(this.games, "slotId"));
  }

  addGame(game: Game) {
    this.games.push(game);
    this.cycle.slotGameCounter
      .play(game.homeTeam, game.slotId)
      .play(game.awayTeam, game.slotId);
    return this;
  }

  toString() {
    return _.sortBy(this.games, "slotId")
      .map((game) => game.toString())
      .join(" ");
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
  public slotGameCounter: GameCounter;

  constructor(slots: number) {
    this.slots = slots;
    this.slotGameCounter = new GameCounter(this.slots);
    this.bufferRound = new Round(this);
  }

  toString() {
    return this.rounds.map((round) => round.toString()).join("\r\n");
  }

  get teamIds() {
    return _.map(this.rounds, "teamIds");
  }

  get currentRound(): Round {
    if (
      _.isEmpty(this.rounds) ||
      _.last(this.rounds)?.numGames === this.slots
    ) {
      const gamesFromBuffer = this.bufferRound.games.slice(0, this.slots);
      this.bufferRound.games = this.bufferRound.games.slice(this.slots);

      const nextRound = new Round(this);
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
      .orderBy(
        [
          "gamesPlayed",
          //this.slotGameCounter.maxPlayedSlotGames(team),
          (team) => this.slotGameCounter.getSpreadInPlayedSlots(team),
          () => Math.random(),
        ],
        ["asc", "desc", "asc"]
      )

      .head();
    //console.log("less played team", lessPlayedTeam);

    return lessPlayedTeam;
  }

  addGame(homeTeam: Team, awayTeam: Team) {
    const slotId = this.slotGameCounter.getNextSlotFor(
      homeTeam!,
      awayTeam!,
      this.currentRound
    );
    const game = new Game(homeTeam, awayTeam, slotId);
    this.games.push(game);
    this.currentRound.addGame(game);
    return this;
  }

  get numGames() {
    return _.size(this.games);
  }

  get numRealGames() {
    return _.size(_.reject(this.games, "isFake"));
  }
}

type Fixture = Round[];

export class FixtureBuilder {
  public rounds = [];
  public cycle: Cycle;
  public slotNumber: number;
  public teamNumber: number;

  constructor(teamNumber: number, slotNumber: number) {
    this.cycle = new Cycle(slotNumber);
    this.slotNumber = slotNumber;
    this.teamNumber = teamNumber;
  }

  generateFixture(): Cycle {
    if (this.slotNumber > this.teamNumber / 2) {
      throw new Error(
        `slotNumber cannot be larger than half team number ${this.teamNumber} < ${this.slotNumber}`
      );
    }

    if (this.slotNumber < 1) {
      return this.cycle;
    }

    this.cycle.teams = this.makeTeams(this.teamNumber);
    while (
      this.cycle.numRealGames <
      (this.teamNumber * (this.teamNumber - 1)) / 2
    ) {
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
      this.cycle.addGame(new Team(-1), new Team(-1));
      return false;
    }
    const opponent = this.cycle.getOpponentFor(teamLessPlayed);

    const [awayTeam, homeTeam] = _.sortBy(
      [teamLessPlayed, opponent],
      "homePlayFactor"
    );

    this.cycle.addGame(homeTeam!, awayTeam!);

    return true;
  }
}
