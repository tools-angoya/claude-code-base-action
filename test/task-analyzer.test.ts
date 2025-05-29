import { describe, expect, it } from "bun:test";
import {
  analyzeTaskComplexity,
  analyzeTaskSync,
  decomposeComplexTask,
  recommendMode,
} from "../src/task-analyzer.js";

describe("TaskAnalyzer", () => {
  describe("analyzeTaskComplexity", () => {
    it("should identify simple tasks", () => {
      const result = analyzeTaskComplexity("バグを修正してください");

      expect(result.level).toBe("simple");
      expect(result.score).toBeLessThan(5);
    });

    it("should identify complex tasks", () => {
      const result = analyzeTaskComplexity(
        "マイクロサービスアーキテクチャでシステムを設計し、実装、テスト、デプロイまで行ってください",
      );

      expect(result.level).toBe("complex");
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it("should provide reasons for complexity", () => {
      const result = analyzeTaskComplexity("システム設計とAPI実装");

      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes("システム"))).toBe(true);
    });
  });

  describe("recommendMode", () => {
    it("should recommend architect for design tasks", () => {
      const result = recommendMode("システム設計を行ってください");

      expect(result.mode).toBe("architect");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should recommend code for implementation tasks", () => {
      const result = recommendMode("プログラムを実装してください");

      expect(result.mode).toBe("code");
    });

    it("should recommend debug for bug fixing", () => {
      const result = recommendMode("バグを修正してください");

      expect(result.mode).toBe("debug");
    });

    it("should recommend ask for questions", () => {
      const result = recommendMode("これについて教えてください");

      expect(result.mode).toBe("ask");
    });

    it("should work with custom prompts", () => {
      const customPrompts = new Map([
        ["architect", "カスタムアーキテクトプロンプト"],
        ["code", "カスタムコードプロンプト"],
      ]);

      const result = recommendMode("設計してください", customPrompts);

      expect(result.mode).toBe("architect");
    });
  });

  describe("decomposeComplexTask", () => {
    it("should decompose system design tasks", () => {
      const result = decomposeComplexTask("システム設計と実装を行ってください");

      expect(result.length).toBeGreaterThan(1);
      expect(result.some((task) => task.mode === "architect")).toBe(true);
      expect(result.some((task) => task.mode === "code")).toBe(true);
    });

    it("should handle single-mode tasks", () => {
      const result = decomposeComplexTask("バグを修正してください");

      expect(result.length).toBe(1);
      expect(result[0]?.mode).toBe("debug");
    });

    it("should set proper dependencies", () => {
      const result = decomposeComplexTask(
        "システム設計、実装、テストを行ってください",
      );

      const designTask = result.find((task) => task.mode === "architect");
      const implementationTask = result.find((task) => task.mode === "code");
      const testingTask = result.find((task) => task.mode === "debug");

      expect(designTask?.dependencies).toEqual([]);
      expect(implementationTask?.dependencies).toContain("design");
      expect(testingTask?.dependencies).toContain("implementation");
    });
  });

  describe("analyzeTaskSync", () => {
    it("should analyze simple tasks synchronously", () => {
      const result = analyzeTaskSync("バグを修正してください");

      expect(result.complexity.level).toBe("simple");
      expect(result.recommendedMode.mode).toBe("debug");
      expect(result.subTasks.length).toBe(0);
      expect(result.requiresOrchestration).toBe(false);
    });

    it("should analyze complex tasks synchronously", () => {
      const result = analyzeTaskSync("システム設計と実装を行ってください");

      expect(result.complexity.level).toBe("complex");
      expect(result.subTasks.length).toBeGreaterThan(1);
      expect(result.requiresOrchestration).toBe(true);
    });

    it("should work with custom prompts", () => {
      const customPrompts = new Map([["architect", "カスタムプロンプト"]]);

      const result = analyzeTaskSync("設計してください", customPrompts);

      expect(result.recommendedMode.mode).toBe("architect");
    });
  });
});
