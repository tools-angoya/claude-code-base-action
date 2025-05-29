import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { detectBoomerangTask } from "../src/boomerang-task.js";
import { CustomModeLoader } from "../src/custom-mode-loader.js";

describe("Custom Mode Integration", () => {
  let tempDir: string;
  let loader: CustomModeLoader;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "claude-integration-test-"));
    loader = new CustomModeLoader(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("End-to-End Custom Mode Loading", () => {
    it("should load and use custom prompts", async () => {
      await writeFile(
        join(tempDir, "architect.md"),
        "あなたは経験豊富なシステムアーキテクトです。セキュリティを重視してください。",
      );
      await writeFile(
        join(tempDir, "code.md"),
        "あなたは優秀なプログラマーです。クリーンコードを心がけてください。",
      );

      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(2);
      expect(customPrompts.get("architect")).toContain("システムアーキテクト");
      expect(customPrompts.get("code")).toContain("プログラマー");
    });

    it("should integrate with boomerang task detection", async () => {
      await writeFile(
        join(tempDir, "architect.md"),
        "カスタムアーキテクトプロンプト",
      );

      const customPrompts = await loader.loadCustomPrompts();
      const promptContent = "/architect システム設計を行ってください";

      const boomerangConfig = detectBoomerangTask(promptContent, customPrompts);

      expect(boomerangConfig).not.toBeNull();
      expect(boomerangConfig?.targetMode).toBe("architect");
      expect(boomerangConfig?.taskDescription).toBe(
        "システム設計を行ってください",
      );
    });

    it("should handle mixed valid and invalid files", async () => {
      await writeFile(
        join(tempDir, "architect.md"),
        "有効なアーキテクトプロンプト",
      );
      await writeFile(join(tempDir, "invalid-mode.md"), "無効なモード");
      await writeFile(join(tempDir, "README.md"), "READMEファイル");
      await writeFile(join(tempDir, "code.md"), "有効なコードプロンプト");

      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(2);
      expect(customPrompts.has("architect")).toBe(true);
      expect(customPrompts.has("code")).toBe(true);
      expect(customPrompts.has("invalid-mode")).toBe(false);
    });

    it("should handle empty directory gracefully", async () => {
      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(0);
    });

    it("should handle directory with only invalid files", async () => {
      await writeFile(join(tempDir, "README.md"), "READMEファイル");
      await writeFile(join(tempDir, "invalid.txt"), "テキストファイル");
      await writeFile(join(tempDir, "wrong-mode.md"), "無効なモード名");

      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle file system errors gracefully", async () => {
      const nonExistentLoader = new CustomModeLoader("/non/existent/path");

      const customPrompts = await nonExistentLoader.loadCustomPrompts();

      expect(customPrompts.size).toBe(0);
    });

    it("should handle empty files", async () => {
      await writeFile(join(tempDir, "architect.md"), "");

      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(0);
    });

    it("should handle whitespace-only files", async () => {
      await writeFile(join(tempDir, "architect.md"), "   \n\t  \n  ");

      const customPrompts = await loader.loadCustomPrompts();

      expect(customPrompts.size).toBe(0);
    });
  });
});
