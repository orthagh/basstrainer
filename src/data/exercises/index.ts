export type { Exercise } from './types';

import { sixteenthNotesFoundation } from './sixteenthNotesFoundation';
import { stringCrossing } from './stringCrossing';
import { groovePatterns } from './groovePatterns';
import { melodicMovement } from './melodicMovement';
import { advancedGrooves } from './advancedGrooves';
import { speedBuilders } from './speedBuilders';

export {
  sixteenthNotesFoundation,
  stringCrossing,
  groovePatterns,
  melodicMovement,
  advancedGrooves,
  speedBuilders,
};

/**
 * All exercises combined in progression order.
 */
export const exercises = [
  ...sixteenthNotesFoundation,
  ...stringCrossing,
  ...groovePatterns,
  ...melodicMovement,
  ...advancedGrooves,
  ...speedBuilders,
];
