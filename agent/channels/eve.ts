import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

import { browserChannelEvents } from "../lib/browser-runtime";
import { studioAuth } from "../../server/browser/studio-auth";

export default eveChannel({
  auth: [studioAuth, vercelOidc(), localDev()],
  events: browserChannelEvents,
});
