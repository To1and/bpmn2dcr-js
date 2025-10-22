// DCR Engine - Core functionality for DCR graph execution and manipulation
// Extracted from dcr-js/dcr-engine for unified dependency management

import type {
  DCRGraph,
  Marking,
  SubProcess,
  isSubProcess,
  EventMap,
  Event,
  DCRGraphS,
  Nestings
} from "./types"

import {
  execute,
  isEnabled,
  isAccepting,
  executeS,
  isEnabledS,
  isAcceptingS
} from "./executionEngine"

import { moddleToDCR } from "./graphConversion"
import { copyMarking } from "./utility"
import layoutGraph from "./layout"
import { nestDCR } from "./nesting"

export {
  // Types
  DCRGraph,
  DCRGraphS,
  EventMap,
  Marking,
  SubProcess,
  Event,
  Nestings,
  isSubProcess,

  // Execution Engine
  execute,
  isAccepting,
  isEnabled,
  executeS,
  isEnabledS,
  isAcceptingS,

  // Graph Operations
  moddleToDCR,
  copyMarking,
  layoutGraph,
  nestDCR
}
