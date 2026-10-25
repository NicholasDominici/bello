import { get } from "@vercel/blob";

const FONT_FILES = new Set([
  "plain-regular.woff2",
  "plain-medium.woff2",
  "gt-planar-regular.woff2",
  "gt-planar-medium.woff2",
  "gt-standard-mono-regular.woff2",
]);

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = process.env.BRAND_FONTS_READ_WRITE_TOKEN;
  if (!token || !FONT_FILES.has(file)) return notFound();

  try {
    const result = await get(`fonts/${file}`, { access: "private", token });
    if (!result || result.statusCode !== 200) return notFound();

    return new Response(result.stream, {
      headers: {
        "Content-Type": "font/woff2",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
