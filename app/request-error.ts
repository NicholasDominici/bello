/** Show actionable request failures without reflecting private provider response bodies. */
import { ClientError } from "eve/client";

export function requestErrorMessage(error: unknown): string {
  if (error instanceof ClientError && error.status === 401)
    return "Authentication required. Sign in to this BELLO instance and retry. Your draft is saved.";
  if (error instanceof ClientError && error.status === 403)
    return "Access denied. Check this instance's access settings and retry. Your draft is saved.";
  return "The request failed. Check the connection or server configuration and retry. Your draft is saved.";
}
