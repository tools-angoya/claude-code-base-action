import { describe, expect, it } from "bun:test";
import {
  createBoomerangTaskPrompt,
  createNewTaskInstruction,
  detectBoomerangTask,
} from "../src/boomerang-task.js";

describe("BoomerangTask", () => {
  describe("detectBoomerangTask", () => {
    it("should detect architect boomerang tasks", () => {
      const content = "/architect システム設計を行ってください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("architect");
      expect(result?.taskDescription).toBe("システム設計を行ってください");
      expect(result?.triggerPhrase).toBe(
        "/architect システム設計を行ってください",
      );
    });

    it("should detect code boomerang tasks", () => {
      const content = "/code APIを実装してください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("code");
      expect(result?.taskDescription).toBe("APIを実装してください");
    });

    it("should detect debug boomerang tasks", () => {
      const content = "/debug バグを修正してください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("debug");
      expect(result?.taskDescription).toBe("バグを修正してください");
    });

    it("should detect ask boomerang tasks", () => {
      const content = "/ask これについて説明してください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("ask");
      expect(result?.taskDescription).toBe("これについて説明してください");
    });

    it("should detect orchestrator boomerang tasks", () => {
      const content = "/orchestrator 複数のタスクを管理してください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("orchestrator");
      expect(result?.taskDescription).toBe("複数のタスクを管理してください");
    });

    it("should work with custom prompts", () => {
      const customPrompts = new Map([["custom-mode", "カスタムプロンプト"]]);
      const content = "/custom-mode カスタムタスクを実行してください";

      const result = detectBoomerangTask(content, customPrompts);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("custom-mode");
      expect(result?.taskDescription).toBe("カスタムタスクを実行してください");
    });

    it("should return null for non-boomerang content", () => {
      const content = "通常のプロンプトです";

      const result = detectBoomerangTask(content);

      expect(result).toBeNull();
    });

    it("should handle case insensitive matching", () => {
      const content = "/ARCHITECT システム設計を行ってください";

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("architect");
    });

    it("should handle multiline content", () => {
      const content = `プロジェクトの説明
      
/code APIを実装してください

追加の詳細`;

      const result = detectBoomerangTask(content);

      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("code");
      expect(result?.taskDescription).toBe("APIを実装してください");
    });
  });

  describe("createBoomerangTaskPrompt", () => {
    it("should create a proper boomerang task prompt", () => {
      const config = {
        targetMode: "architect",
        taskDescription: "システム設計を行ってください",
        triggerPhrase: "/architect システム設計を行ってください",
      };
      const originalPrompt = "元のプロンプト内容";

      const result = createBoomerangTaskPrompt(config, originalPrompt);

      expect(result).toContain("ブーメランタスク");
      expect(result).toContain(config.taskDescription);
      expect(result).toContain(config.targetMode);
      expect(result).toContain(originalPrompt);
    });
  });

  describe("createNewTaskInstruction", () => {
    it("should create new task instruction", () => {
      const config = {
        targetMode: "code",
        taskDescription: "APIを実装してください",
        triggerPhrase: "/code APIを実装してください",
      };

      const result = createNewTaskInstruction(config);

      expect(result).toContain("新しいタスクを作成してください");
      expect(result).toContain(config.targetMode);
      expect(result).toContain(config.taskDescription);
      expect(result).toContain("ブーメランタスク");
    });
  });
});
