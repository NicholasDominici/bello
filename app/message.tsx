/** Render assistant Markdown with raw HTML disabled and safe default link protocols. */
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Message({ text }: { text: string }) {
  return <div className="message-content"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{ img: ({ alt }) => <span>{alt ? `[Image: ${alt}]` : "[Image]"}</span> }}>{text}</Markdown></div>;
}
