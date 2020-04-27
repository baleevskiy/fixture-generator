import _ from "lodash";
import { FixtureBuilder } from "../index";

_.forEach(_.range(4, 25), (teamNumber) => {
  _.forEach([0, 1, 2], (extraBye) => {
    it(`should generate fiture for ${teamNumber} teams with ${extraBye} extrabye`, () => {
      const builder = new FixtureBuilder();
      const cycle = builder.generateFixture(
        teamNumber,
        _.floor(teamNumber / 2) - extraBye
      );

      //expect(cycle.toString()).toMatchSnapshot();
      console.log(JSON.stringify(cycle.teamIds));
      expect(_.zip(...cycle.teamIds)).toEqual([]);
    });
  });
});
