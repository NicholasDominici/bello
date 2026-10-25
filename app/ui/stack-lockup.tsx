const STACK = [
  { name: "Browserbase", mark: "B", tone: "brand" },
  { name: "eve", mark: "eve", tone: "ink" },
  { name: "Linq", mark: "linq", tone: "ink" },
  { name: "Stripe Link", mark: "link", tone: "link" },
] as const;

export function StackLockup() {
  return (
    <footer className="stack">
      <p className="stack-label">Built on</p>
      <ul className="stack-tiles">
        {STACK.map((item, index) => (
          <li
            key={item.name}
            className="stack-tile"
            data-tone={item.tone}
            style={{ animationDelay: `${index * 90}ms` }}
            title={item.name}
          >
            <span aria-hidden="true">{item.mark}</span>
            <span className="sr-only">{item.name}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}
