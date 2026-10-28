/** Project successful Orbit artifacts; a new search replaces old search results. */
import { orbitProfileSchema, orbitSearchSchema, type OrbitPerson, type OrbitSearch } from "../lib/orbit-result";

export function orbitPreview(events: readonly unknown[]) {
  let search: OrbitSearch | undefined;
  let error: string | undefined;
  let latestArtifact: "people" | "browser" = "browser";
  const people = new Map<string, OrbitPerson>();
  for (const value of events) {
    if (!value || typeof value !== "object") continue;
    const event = value as { type?: string; data?: { result?: { kind?: string; isError?: boolean; output?: unknown; toolName?: string } } };
    const result = event.data?.result;
    if (event.type !== "action.result" || result?.kind !== "tool-result" || result.isError) continue;
    if (["run", "screenshot", "snapshot"].includes(result.toolName ?? "")) latestArtifact = "browser";
    const snapshot = orbitSearchSchema.safeParse(result.output);
    if (snapshot.success) {
      if (search?.search_id !== snapshot.data.search_id) people.clear();
      search = snapshot.data;
      for (const person of search.people) people.set(person.profile_id, person);
      error = undefined;
      latestArtifact = "people";
      continue;
    }
    const profile = orbitProfileSchema.safeParse(result.output);
    if (profile.success) {
      people.set(profile.data.person.profile_id, profile.data.person);
      error = undefined;
      latestArtifact = "people";
      continue;
    }
    const output = result.output;
    if (output && typeof output === "object" && "provider" in output && output.provider === "orbit" && "operation" in output && output.operation === "error" && "message" in output && typeof output.message === "string") {
      error = output.message.slice(0, 500);
      latestArtifact = "people";
    }
  }
  return { people: [...people.values()], search, error, latestArtifact };
}
