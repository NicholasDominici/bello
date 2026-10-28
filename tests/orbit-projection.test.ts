/** Orbit context uses validated artifacts and replaces unrelated searches. */
import { describe, expect, it } from "vitest";
import { orbitPreview } from "../app/orbit-projection";
import { orbitSourceUrl } from "../lib/orbit-result";
const person = (id = "one") => ({ profile_id: id, status: "ready", name: "Mira Chen", sources: [] });
const event = (output: unknown, toolName = "orbit_search", isError = false) => ({ type: "action.result", data: { result: { kind: "tool-result", output, toolName, isError } } });
const search = (id: string, people = [person()]) => ({ provider: "orbit", operation: "search", request_id: "request", search_id: id, status: "completed", people });
describe("Orbit workspace projection", () => {
  it("replaces results for a new query and merges selected profile context by stable ID", () => {
    const view = orbitPreview([event(search("old")), event(search("new", [person("two")])), event({ provider: "orbit", operation: "profile", status: "completed", person: { ...person("two"), bio: "Compiler tools" } })]);
    expect(view.people).toHaveLength(1);
    expect(view.people[0]).toMatchObject({ profile_id: "two", bio: "Compiler tools" });
    expect(view.latestArtifact).toBe("people");
  });
  it("keeps previous context while making a subsequent provider error explicit", () => {
    const view = orbitPreview([event(search("one")), event({ provider: "orbit", operation: "error", message: "Check the API key." })]);
    expect(view.people).toHaveLength(1);
    expect(view.error).toBe("Check the API key.");
  });
  it("ignores malformed and failed tool output and follows the latest artifact", () => {
    expect(orbitPreview([event({ provider: "orbit", operation: "search", people: [person()] }), event(search("one"), "orbit_search", true)]).people).toEqual([]);
    expect(orbitPreview([event(search("one")), event({}, "screenshot")]).latestArtifact).toBe("browser");
  });
  it("renders only credential-free HTTPS source links", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,hello", "https://user:pass@example.com", "http://example.com"])
      expect(orbitSourceUrl(value)).toBeUndefined();
    expect(orbitSourceUrl("https://example.com/work")).toBe("https://example.com/work");
  });
});
