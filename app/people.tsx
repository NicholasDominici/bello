/** Source-backed Orbit context, with explicit pending and partial-success states. */
import Image from "next/image";
import type { OrbitPerson, OrbitSearch } from "../lib/orbit-result";
import { orbitSourceUrl } from "../lib/orbit-result";

export function OrbitScene() {
  return <div className="orbital-scene" aria-hidden="true">
    <Image src="/orbit-logo.png" width={926} height={941} alt="" />
  </div>;
}
export default function People({ people, search, error }: { people: OrbitPerson[]; search?: OrbitSearch; error?: string }) {
  return <div className="people-panel">
    <div className="people-heading"><div><p className="eyebrow">ORBIT PEOPLE INTELLIGENCE</p><h2>{people.length ? `${people.length} ${people.length === 1 ? "person" : "people"} in view` : "Context changes everything."}</h2></div>
      {search && <span className="result-state">{search.status === "running" ? "Researching" : search.status === "completed_with_errors" ? "Partial results" : search.status === "failed" ? "Search failed" : "Complete"}</span>}
    </div>
    {error && <p role="alert">{error}{people.length ? " Previous results remain below." : ""}</p>}
    {!people.length && <div className="empty people-empty"><OrbitScene/><h3>{search?.status === "completed" ? "No matches this time." : search?.status === "running" ? "Finding your people…" : "A little context goes a long way."}</h3><p>{search?.status === "completed" ? "Add a company, role, or location to narrow your next search." : "Ask BELLO to find someone, explore their work, or help you prepare for a conversation."}</p></div>}
    <div className="people-list">{people.map(person => <article className="person-card" key={person.profile_id}>
      <div className="person-header"><div className="person-avatar" aria-hidden="true">{person.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</div><div><h3>{person.name}</h3>{person.headline && <p>{person.headline}</p>}{person.location && <small>{person.location}</small>}</div><span className={`person-status person-status-${person.status}`}>{person.status === "ready" ? "Ready" : person.status === "failed" ? "Unavailable" : "Building"}</span></div>
      {person.bio && <p className="person-bio">{person.bio}</p>}
      <div className="person-links">{orbitSourceUrl(person.profile_url) && <a href={orbitSourceUrl(person.profile_url)} target="_blank" rel="noreferrer">View Orbit profile ↗</a>}
        {person.sources.length > 0 && <details><summary>{person.sources.length} {person.sources.length === 1 ? "source" : "sources"}</summary><ul>{person.sources.map(source => orbitSourceUrl(source.url) ? <li key={source.url}><a href={orbitSourceUrl(source.url)} target="_blank" rel="noreferrer">{source.title} ↗</a></li> : null)}</ul></details>}
      </div>
    </article>)}</div>
    {search?.billing && <p className="footnote">Search used {search.billing.consumed_credits} Orbit {search.billing.consumed_credits === 1 ? "credit" : "credits"}{search.billing.status === "open" ? " · search still in progress" : ""}</p>}
  </div>;
}
