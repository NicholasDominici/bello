import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

import { browserChannelEvents } from "../lib/browser-runtime";
import { operatorAuth } from "../../server/operator-auth";

export default eveChannel({
  auth: [operatorAuth, vercelOidc(), localDev()],
  events: browserChannelEvents,
});
