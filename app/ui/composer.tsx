"use client";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const canSend = !disabled && value.trim().length > 0;
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="message" className="sr-only">
        Message Bell
      </label>
      <textarea
        id="message"
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          if (canSend) onSubmit();
        }}
        placeholder="What would you like to do?"
        disabled={disabled}
      />
      {busy ? (
        <button type="button" className="composer-button" onClick={onStop} aria-label="Stop">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button type="submit" className="composer-button" disabled={!canSend} aria-label="Send">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </form>
  );
}
