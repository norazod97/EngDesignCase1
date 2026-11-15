// Gateway factory. Switch APP_CONFIG.gateway to plug in a real adapter
// (e.g. an AAS / OPC UA client) that implements the CellGateway contract.

import { APP_CONFIG } from "../../config/appConfig.js";
import { CELLS } from "../../mock/fixtures.js";
import { assertGateway } from "./CellGateway.js";
import { MockCellGateway } from "./MockCellGateway.js";

export function createCellGateway(cellId, wizardChannel) {
  switch (APP_CONFIG.gateway) {
    case "mock":
    default:
      return assertGateway(new MockCellGateway({ cell: CELLS[cellId], wizardChannel }));
  }
}
