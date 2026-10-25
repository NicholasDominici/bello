export function Thinking({ label = "Thinking" }: { label?: string }) {
  return (
    <span className="thinking">
      <span className="thinking-square" aria-hidden="true" />
      <span className="thinking-text">
        {label}
        <span className="thinking-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </span>
  );
}

export function TypingBubble() {
  return (
    <div className="bubble-row assistant">
      <div className="bubble bubble-typing" role="img" aria-label="Bell is typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
