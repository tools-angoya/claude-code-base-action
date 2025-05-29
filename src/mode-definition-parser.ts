import type { ModePromptResult } from "./types/custom-mode.js";

export class ModeDefinitionParser {
  static parsePromptFile(content: string, filePath: string): ModePromptResult {
    try {
      const slug = this.extractSlugFromFilename(filePath);

      if (!this.isValidModeSlug(slug)) {
        return {
          success: false,
          error: `Invalid mode slug: ${slug}. Must be one of: architect, code, debug, ask, orchestrator`,
        };
      }

      const custom_instructions = content.trim();

      if (!custom_instructions) {
        return {
          success: false,
          error: "Empty prompt content",
        };
      }

      return {
        success: true,
        prompt: {
          slug,
          custom_instructions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse prompt file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  static extractSlugFromFilename(filePath: string): string {
    const filename = filePath.split("/").pop() || "";
    return filename.replace(/\.md$/, "");
  }

  static isValidModeFile(filename: string): boolean {
    return filename.endsWith(".md") && filename !== "README.md";
  }

  private static isValidModeSlug(slug: string): boolean {
    const validSlugs = ["architect", "code", "debug", "ask", "orchestrator"];
    return validSlugs.includes(slug);
  }
}
