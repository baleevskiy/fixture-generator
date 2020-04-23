import _ from "lodash";
import { FixtureBuilder } from "../index";

_.forEach(_.range(4, 25), (teamNumber) => {
  _.forEach([0, 1, 2], (extraBye) => {
    it(`should generate fiture for ${teamNumber} teams with ${extraBye} extrabye`, () => {
      const builder = new FixtureBuilder();

      expect(
        builder
          .generateFixture(teamNumber, _.floor(teamNumber / 2) - extraBye)
          .toString()
      ).toMatchSnapshot();
    });
  });
});
