const PRIVATE_USE_PATTERN = /[\uE000-\uF8FF]/g;

const CITATION_TOKEN_PATTERN =
  /\s*(?:citeturn|filecite|navlist|turn\d+\w*(?:file\d+\w*)?)[^,\s]*,?/g;

export function stripPrivateUse(text: string): string {
  return text.replace(PRIVATE_USE_PATTERN, "");
}

export function stripCitationTokens(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.replace(CITATION_TOKEN_PATTERN, "").trimEnd())
    .join("\n");
}
