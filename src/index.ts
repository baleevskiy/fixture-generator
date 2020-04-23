import _ from "lodash";

class Team {
  public homeGames: number = 0;
  public awayGames: number = 0;
  public playedTo: Team[] = [];
  public teamId: number;

  constructor(teamId) {
    this.teamId = teamId;
  }

  canPlayTo(team) {
    return !_.includes(this.playedTo, team);
  }

  get gamesPlayed() {
    return this.homeGames + this.awayGames;
  }

  get homePlayFactor() {
    return this.awayGames - this.homeGames;
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
  }

  get teams() {
    return [this.homeTeam, this.awayTeam];
  }
}

class Round {
  public games: Game[] = [];

  getTeamsPlayed() {
    return _.uniq(_.flattenDeep(this.games.map((game) => game.teams)));
  }
}

class Cycle {
  public rounds: Round[] = [];
  public teams: Team[] = [];
  public games: Game[] = [];

  get twoTeamsLessPlayed(): Team[] {
    return _(this.teams)
      .sortBy((team) => team.gamesPlayed)
      .splice(0, 2)
      .value();
  }

  addGame(game: Game) {
    this.games.push(game);
    return this;
  }
}

type Fixture = Round[];

class FixtureBuilder {
  public rounds = [];
  public cycle = new Cycle();

  constructor() {}

  schedule(teamNumber: number, slotNumber: number): Fixture {
    this.cycle = new Cycle();
    this.cycle.teams = this.makeTeams(teamNumber);

    return this;
  }

  addRound(round: Round) {}

  makeTeams(number) {
    return _.times(number, (id) => new Team(id + 1));
  }

  scheduleNextGame() {
    const [awayTeam, homeTeam] = _.sortBy(
      this.cycle.twoTeamsLessPlayed,
      "homePlayFactor"
    );
    this.cycle.addGame(new Game(homeTeam, awayTeam));
    return this;
  }
}
