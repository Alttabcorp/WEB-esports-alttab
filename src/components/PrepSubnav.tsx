"use client";

import { SessionFlowStrip } from "./SessionFlowStrip";

/**
 * @deprecated Prefer SessionFlowStrip. Mantido para imports legados.
 */
export function PrepSubnav(_props?: { alertCount?: number }) {
  return <SessionFlowStrip />;
}
