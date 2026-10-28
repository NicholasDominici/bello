/** Access guidance must not expose raw response payloads or provider diagnostics. */
import { ClientError } from "eve/client";
import { describe, expect, it } from "vitest";
import { requestErrorMessage } from "../app/request-error";

describe("safe request errors", () => {
  it("explains authentication and authorization failures", () => {
    expect(requestErrorMessage(new ClientError(401, "private-response"))).toContain("Authentication required");
    expect(requestErrorMessage(new ClientError(403, "private-response"))).toContain("Access denied");
  });
  it("never reflects raw errors or server response bodies", () => {
    for (const error of [new ClientError(500, "private-provider-token"), new Error("private-provider-token"), null]) {
      const message = requestErrorMessage(error);
      expect(message).not.toContain("private-provider-token");
      expect(message).toContain("Your draft is saved");
    }
  });
});
