import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ModeDefinitionParser } from "./mode-definition-parser.js";
import type { ModePromptResult } from "./types/custom-mode.js";
import { ModeLoaderError } from "./types/custom-mode.js";

export class CustomModeLoader {
  private modesDirectory: string;

  constructor(modesDirectory: string = ".claude/modes") {
    this.modesDirectory = modesDirectory;
  }

  async loadCustomPrompts(): Promise<Map<string, string>> {
    const prompts = new Map<string, string>();

    try {
      const files = await this.getValidModeFiles();

      for (const file of files) {
        const result = await this.loadPromptFile(file);
        if (result.success && result.prompt) {
          prompts.set(result.prompt.slug, result.prompt.custom_instructions);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        return prompts;
      }
      throw new ModeLoaderError(
        `Failed to load custom prompts: ${error instanceof Error ? error.message : "Unknown error"}`,
        this.modesDirectory,
        error instanceof Error ? error : undefined,
      );
    }

    return prompts;
  }

  async loadPromptFile(filePath: string): Promise<ModePromptResult> {
    try {
      const content = await readFile(filePath, "utf-8");
      return ModeDefinitionParser.parsePromptFile(content, filePath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async getValidModeFiles(): Promise<string[]> {
    const files = await readdir(this.modesDirectory);
    const validFiles: string[] = [];

    for (const file of files) {
      if (ModeDefinitionParser.isValidModeFile(file)) {
        const filePath = join(this.modesDirectory, file);
        const stats = await stat(filePath);
        if (stats.isFile()) {
          validFiles.push(filePath);
        }
      }
    }

    return validFiles;
  }
}
