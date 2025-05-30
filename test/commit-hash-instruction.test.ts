import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { preparePrompt } from "../src/prepare-prompt";

const TEST_DIR = "/tmp/test-claude-action";
const TEST_PROMPT_FILE = `${TEST_DIR}/test-prompt.txt`;

describe("Commit Hash Instruction", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("preparePrompt", () => {
    it("should add commit hash instruction to inline prompt", async () => {
      const originalPrompt = "Please fix the bug in the code.";

      const config = await preparePrompt({
        prompt: originalPrompt,
        promptFile: "",
      });

      const enhancedContent = await readFile(config.path, "utf-8");

      expect(enhancedContent).toContain(originalPrompt);
      expect(enhancedContent).toContain(
        "重要: コミットを行った場合、コミットハッシュを出力してください。コミットハッシュは完全な40文字の形式で出力し、バッククォートやコードブロックで囲まないでください。",
      );
    });

    it("should add commit hash instruction to file-based prompt", async () => {
      const originalPrompt = "Please implement a new feature.";
      await writeFile(TEST_PROMPT_FILE, originalPrompt);

      const config = await preparePrompt({
        prompt: "",
        promptFile: TEST_PROMPT_FILE,
      });

      const enhancedContent = await readFile(config.path, "utf-8");

      expect(enhancedContent).toContain(originalPrompt);
      expect(enhancedContent).toContain(
        "重要: コミットを行った場合、コミットハッシュを出力してください。コミットハッシュは完全な40文字の形式で出力し、バッククォートやコードブロックで囲まないでください。",
      );
    });

    it("should handle empty prompt correctly", async () => {
      try {
        await preparePrompt({
          prompt: "",
          promptFile: "",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          "Neither 'prompt' nor 'prompt_file' was provided",
        );
      }
    });

    it("should handle both prompt and promptFile provided", async () => {
      await writeFile(TEST_PROMPT_FILE, "test content");

      try {
        await preparePrompt({
          prompt: "test prompt",
          promptFile: TEST_PROMPT_FILE,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          "Both 'prompt' and 'prompt_file' were provided",
        );
      }
    });

    it("should handle non-existent prompt file", async () => {
      try {
        await preparePrompt({
          prompt: "",
          promptFile: "/non/existent/file.txt",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("does not exist");
      }
    });
  });
});
