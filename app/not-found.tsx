/** A branded recovery path for missing workspace and conversation URLs. */
import Link from "next/link";
export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">BELLO / ORBIT</p><h1>Nothing at this address.</h1><p className="muted">This page may have moved. Your workspace is a good place to start.</p><Link href="/">Back to your workspace ↗</Link></main>;
}
