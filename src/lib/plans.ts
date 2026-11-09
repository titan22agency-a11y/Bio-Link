import type { Plan } from "@prisma/client";
import type { BlockType, PageContent } from "./blocks";
import { THEME_PRESETS } from "./presets";

/**
 * Tier limits. Phase 1: shown to staff as warnings only.
 * Phase 2: enforced when a CLIENT edits their own page (see api/admin/pages/[id]).
 */
export const PLAN_LIMITS: Record<Plan, {
  maxPages: number;
  maxBlocks: number;
  blockTypes: BlockType[] | "all";
  proThemes: boolean;
  customDomain: boolean;
  removeBranding: boolean;
  analyticsDays: number;
}> = {
  FREE: {
    maxPages: 1,
    maxBlocks: 12,
    blockTypes: ["profile", "heading", "text", "button", "social", "spacer", "image"],
    proThemes: false,
    customDomain: false,
    removeBranding: false,
    analyticsDays: 7,
  },
  PRO: { maxPages: 3, maxBlocks: 50, blockTypes: "all", proThemes: true, customDomain: true, removeBranding: true, analyticsDays: 90 },
  BUSINESS: { maxPages: 20, maxBlocks: 100, blockTypes: "all", proThemes: true, customDomain: true, removeBranding: true, analyticsDays: 365 },
};

export function planViolations(plan: Plan, content: PageContent, customDomain?: string | null): string[] {
  const l = PLAN_LIMITS[plan];
  const out: string[] = [];
  if (content.blocks.length > l.maxBlocks) out.push(`${plan} plan allows ${l.maxBlocks} blocks`);
  if (l.blockTypes !== "all") {
    const allowed = l.blockTypes;
    const bad = [...new Set(content.blocks.map((b) => b.type).filter((t) => !allowed.includes(t)))];
    if (bad.length) out.push(`Blocks not in ${plan} plan: ${bad.join(", ")}`);
  }
  const preset = THEME_PRESETS.find((p) => p.key === content.theme.preset);
  if (!l.proThemes && (preset?.pro || content.theme.bgType === "image")) out.push("Premium themes need PRO");
  if (!l.removeBranding && !content.showBranding) out.push("Removing branding needs PRO");
  if (!l.customDomain && customDomain) out.push("Custom domains need PRO");
  return out;
}
