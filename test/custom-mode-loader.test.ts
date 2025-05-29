import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { CustomModeLoader } from "../src/custom-mode-loader.js";

describe("CustomModeLoader", () => {
  let tempDir: string;
  let loader: CustomModeLoader;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "claude-test-"));
    loader = new CustomModeLoader(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("loadCustomPrompts", () => {
    it("should load valid prompt files", async () => {
      await writeFile(
        join(tempDir, "architect.md"),
        "あなたは経験豊富なアーキテクトです。",
      );
      await writeFile(
        join(tempDir, "code.md"),
        "あなたは優秀なプログラマーです。",
      );

      const prompts = await loader.loadCustomPrompts();

      expect(prompts.size).toBe(2);
      expect(prompts.get("architect")).toBe(
        "あなたは経験豊富なアーキテクトです。",
      );
      expect(prompts.get("code")).toBe("あなたは優秀なプログラマーです。");
    });

    it("should ignore invalid files", async () => {
      await writeFile(join(tempDir, "architect.md"), "有効なプロンプト");
      await writeFile(join(tempDir, "README.md"), "無視されるファイル");
      await writeFile(join(tempDir, "invalid.txt"), "無視されるファイル");

      const prompts = await loader.loadCustomPrompts();

      expect(prompts.size).toBe(1);
      expect(prompts.get("architect")).toBe("有効なプロンプト");
    });

    it("should handle non-existent directory", async () => {
      const nonExistentLoader = new CustomModeLoader("non-existent-dir");

      const prompts = await nonExistentLoader.loadCustomPrompts();

      expect(prompts.size).toBe(0);
    });

    it("should skip invalid mode slugs", async () => {
      await writeFile(join(tempDir, "invalid-mode.md"), "無効なモード");
      await writeFile(join(tempDir, "architect.md"), "有効なモード");

      const prompts = await loader.loadCustomPrompts();

      expect(prompts.size).toBe(1);
      expect(prompts.get("architect")).toBe("有効なモード");
    });
  });

  describe("loadPromptFile", () => {
    it("should load a single prompt file", async () => {
      const filePath = join(tempDir, "architect.md");
      await writeFile(filePath, "テストプロンプト");

      const result = await loader.loadPromptFile(filePath);

      expect(result.success).toBe(true);
      expect(result.prompt?.slug).toBe("architect");
      expect(result.prompt?.custom_instructions).toBe("テストプロンプト");
    });

    it("should handle file read errors", async () => {
      const result = await loader.loadPromptFile("non-existent-file.md");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read file");
    });
  });
});
