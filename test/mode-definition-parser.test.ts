import { describe, expect, it } from "bun:test";
import { ModeDefinitionParser } from "../src/mode-definition-parser.js";

describe("ModeDefinitionParser", () => {
  describe("parsePromptFile", () => {
    it("should parse a simple prompt file", () => {
      const content = `あなたは経験豊富なアーキテクトです。
システム設計に特化してください。`;

      const result = ModeDefinitionParser.parsePromptFile(
        content,
        "architect.md",
      );

      expect(result.success).toBe(true);
      expect(result.prompt?.slug).toBe("architect");
      expect(result.prompt?.custom_instructions).toBe(content.trim());
    });

    it("should handle empty content", () => {
      const content = "";

      const result = ModeDefinitionParser.parsePromptFile(
        content,
        "architect.md",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Empty prompt content");
    });

    it("should validate mode slug", () => {
      const content = "テストプロンプト";

      const result = ModeDefinitionParser.parsePromptFile(
        content,
        "invalid-mode.md",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid mode slug");
    });

    it("should accept valid mode slugs", () => {
      const validSlugs = ["architect", "code", "debug", "ask", "orchestrator"];

      for (const slug of validSlugs) {
        const result = ModeDefinitionParser.parsePromptFile(
          "テストプロンプト",
          `${slug}.md`,
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe("extractSlugFromFilename", () => {
    it("should extract slug from filename", () => {
      expect(ModeDefinitionParser.extractSlugFromFilename("architect.md")).toBe(
        "architect",
      );
      expect(
        ModeDefinitionParser.extractSlugFromFilename("path/to/code.md"),
      ).toBe("code");
    });
  });

  describe("isValidModeFile", () => {
    it("should validate mode files", () => {
      expect(ModeDefinitionParser.isValidModeFile("architect.md")).toBe(true);
      expect(ModeDefinitionParser.isValidModeFile("code.md")).toBe(true);
      expect(ModeDefinitionParser.isValidModeFile("README.md")).toBe(false);
      expect(ModeDefinitionParser.isValidModeFile("test.txt")).toBe(false);
    });
  });
});
