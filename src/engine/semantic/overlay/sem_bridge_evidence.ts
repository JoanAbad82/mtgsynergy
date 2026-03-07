export function isExplicitSacrificeCreatureText(text: string): boolean {
  return /^\s*Sacrifice a creature[: ,]/i.test(text);
}
