import type { StoryboardArtifact } from "../../core/contracts.js";

const LIGHT_TEXT = "#f7fbff";
const DARK_BACKGROUND = "#071226";
export const SAFE_AREA_PIXELS = 72;

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const linear = rgb.map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return (
    0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => strings(entry));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => strings(entry));
  }
  return [];
}

export function inspectSceneLayout(
  scene: StoryboardArtifact["scenes"][number],
): string[] {
  const warnings: string[] = [];
  const props = scene.visual.props;
  const textValues = strings(props);
  if (textValues.some((text) => text.length > 180)) {
    warnings.push("Một text block vượt 180 ký tự; có nguy cơ overflow.");
  }
  const totalCharacters = textValues.reduce(
    (total, text) => total + text.length,
    0,
  );
  if (totalCharacters > 650) {
    warnings.push("Tổng lượng chữ trong scene vượt 650 ký tự.");
  }
  if (scene.visual.type === "BULLET") {
    const bullets = props.bullets;
    if (Array.isArray(bullets) && bullets.length > 5) {
      warnings.push("Bullet scene vượt năm ý.");
    }
  }
  if (contrastRatio(LIGHT_TEXT, DARK_BACKGROUND) < 4.5) {
    warnings.push("Theme không đạt WCAG contrast 4.5:1.");
  }
  return warnings;
}
