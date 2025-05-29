import { describe, expect, it } from "bun:test";
import { createBoomerangTaskPrompt, detectBoomerangTask } from "../src/boomerang-task";

describe("ブーメランタスク機能", () => {
  describe("detectBoomerangTask", () => {
    it("architectモードのタスクを検出する", () => {
      const content = "/architect システムアーキテクチャを設計してください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("architect");
      expect(result?.taskDescription).toBe("システムアーキテクチャを設計してください");
    });

    it("debugモードのタスクを検出する", () => {
      const content = "/debug このバグを修正してください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("debug");
      expect(result?.taskDescription).toBe("このバグを修正してください");
    });

    it("askモードのタスクを検出する", () => {
      const content = "/ask この技術について教えてください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("ask");
      expect(result?.taskDescription).toBe("この技術について教えてください");
    });

    it("orchestratorモードのタスクを検出する", () => {
      const content = "/orchestrator 複数のタスクを調整してください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("orchestrator");
      expect(result?.taskDescription).toBe("複数のタスクを調整してください");
    });

    it("codeモードのタスクを検出する", () => {
      const content = "/code 新しい機能を実装してください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("code");
      expect(result?.taskDescription).toBe("新しい機能を実装してください");
    });

    it("ブーメランタスクでない場合はnullを返す", () => {
      const content = "通常のコメントです";
      const result = detectBoomerangTask(content);
      
      expect(result).toBeNull();
    });

    it("大文字小文字を区別しない", () => {
      const content = "/ARCHITECT システムを設計してください";
      const result = detectBoomerangTask(content);
      
      expect(result).not.toBeNull();
      expect(result?.targetMode).toBe("architect");
    });
  });

  describe("createBoomerangTaskPrompt", () => {
    it("適切なブーメランタスクプロンプトを作成する", () => {
      const config = {
        targetMode: "architect",
        taskDescription: "システムアーキテクチャを設計してください",
        triggerPhrase: "/architect システムアーキテクチャを設計してください",
      };
      const originalPrompt = "元のプロンプト内容";
      
      const result = createBoomerangTaskPrompt(config, originalPrompt);
      
      expect(result).toContain("# ブーメランタスク");
      expect(result).toContain(config.taskDescription);
      expect(result).toContain(config.targetMode);
      expect(result).toContain(originalPrompt);
    });
  });
});