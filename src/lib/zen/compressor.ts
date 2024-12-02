import { Arg, zswitch, eq, s } from "./index";
import {
  pow,
  lt,
  lte,
  gte,
  log,
  log10,
  sign,
  gt,
  exp,
  max,
  abs,
  sub,
  div,
  mult,
  add,
} from "./math";
import { history } from "./history";

const amp2db = (amp: Arg) => mult(20, log10(max(abs(amp), 0.00001)));
const db2amp = (db: Arg) => pow(10, div(db, 20));

export const compressor = (
  in1: Arg,
  ratio: Arg,
  threshold: Arg,
  knee: Arg,
  attack: Arg = 0.01,
  release: Arg = 0.05,
  isSideChain: Arg = 0,
  sidechainIn: Arg = 0,
) => {
  // Detect level from either main or sidechain input
  const detector_db = amp2db(zswitch(isSideChain, sidechainIn, in1));

  // But always process the main input
  const in_db = amp2db(in1);

  const attack_coef = exp(div(log(0.01), mult(attack, 44100)));
  const release_coef = exp(div(log(0.01), mult(release, 44100)));

  const kneeStart = sub(threshold, div(knee, 2));
  const kneeEnd = add(threshold, div(knee, 2));

  // Use detector signal for gain reduction calculation
  const positionWithinKnee = div(sub(detector_db, kneeStart), knee);
  const interpolatedRatio = add(1, mult(positionWithinKnee, sub(ratio, 1)));
  const overThreshold = sub(
    detector_db,
    add(kneeStart, mult(positionWithinKnee, sub(threshold, kneeStart))),
  );

  const gr = zswitch(
    lte(detector_db, kneeStart),
    0,
    zswitch(
      gte(detector_db, kneeEnd),
      mult(sub(detector_db, threshold), sub(1, div(1, ratio))),
      mult(overThreshold, sub(1, div(1, interpolatedRatio))),
    ),
  );

  const prev_gr = history();

  // Apply gain reduction to main input
  return s(
    prev_gr(
      zswitch(
        gt(gr, prev_gr()),
        add(mult(attack_coef, prev_gr()), mult(gr, sub(1, attack_coef))),
        add(mult(release_coef, prev_gr()), mult(gr, sub(1, release_coef))),
      ),
    ),
    mult(sign(in1), db2amp(sub(in_db, prev_gr()))),
  );
};
