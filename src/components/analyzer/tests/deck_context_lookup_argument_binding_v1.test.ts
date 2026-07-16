import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

describe("DeckContextVisibleMvp semantic overlay lookup binding", () => {
  it("passes lookupCard as the second computeSemanticOverlayFromDeckEntries argument", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "src/components/analyzer/panels/DeckContextVisibleMvp.tsx",
    );
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(
      sourcePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const calls: ts.CallExpression[] = [];

    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(sourceFile) ===
          "computeSemanticOverlayFromDeckEntries"
      ) {
        calls.push(node);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.arguments[1]?.getText(sourceFile)).toBe("lookupCard");
    expect(sourceText).toMatch(
      /import\s*\{\s*lookupCard\s*\}\s*from\s*["'][^"']*engine\/cards\/lookup["']/,
    );
  });
});
