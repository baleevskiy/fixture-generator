import _ from "lodash";
import { FixtureBuilder } from "../index";

_.forEach(_.range(4, 25), (teamNumber) => {
  _.forEach([0, 1, 2, 3, 4, 5], (extraBye) => {
    it(`should generate fiture for ${teamNumber} teams with ${extraBye} extrabye`, () => {
      const builder = new FixtureBuilder(
        teamNumber,
        _.floor(teamNumber / 2) - extraBye
      );
      const cycle = builder.generateFixture();

      expect(`\n${cycle.toString()}`).toMatchSnapshot();
      expect(cycle.slotGameCounter).toMatchSnapshot();
      // console.log(JSON.stringify(cycle.teamIds));
      // expect(_.zip(...cycle.teamIds)).toEqual([]);
    });
  });
});

it("should balance the slots", () => {
  const builder = new FixtureBuilder(20, 5);
  const cycle = builder.generateFixture();
  expect(cycle.slotGameCounter).toMatchSnapshot();
});
