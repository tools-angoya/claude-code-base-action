import { describe, expect, it } from "bun:test";
import {
    analyzeTask,
    analyzeTaskComplexity,
    decomposeComplexTask,
    recommendMode,
} from "../src/task-analyzer";

describe("TaskAnalyzer", () => {
  describe("analyzeTaskComplexity", () => {
    it("should identify high complexity tasks", () => {
      const complexTask = "フルスタックWebアプリケーションのシステム設計とアーキテクチャを策定し、セキュリティとパフォーマンスを考慮した実装を行ってください";
      
      const result = analyzeTaskComplexity(complexTask);
      
      expect(result.level).toBe("complex");
      expect(result.score).toBeGreaterThan(5);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("should identify low complexity tasks", () => {
      const simpleTask = "CSSファイルのスタイルを修正してください";
      
      const result = analyzeTaskComplexity(simpleTask);
      
      expect(result.level).toBe("simple");
      expect(result.score).toBeLessThan(5);
    });

    it("should consider sentence and word count", () => {
      const longTask = "これは非常に長いタスクの説明です。" +
        "複数の文章が含まれています。" +
        "各文章は異なる要件を説明しています。" +
        "システムの設計が必要です。" +
        "実装も必要です。" +
        "テストも実行する必要があります。";
      
      const result = analyzeTaskComplexity(longTask);
      
      expect(result.reasons.some(r => r.includes("長い説明文"))).toBe(true);
    });
  });

  describe("recommendMode", () => {
    it("should recommend architect mode for design tasks", () => {
      const designTask = "システムアーキテクチャを設計してください";
      
      const result = recommendMode(designTask);
      
      expect(result.mode).toBe("architect");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should recommend code mode for implementation tasks", () => {
      const codeTask = "ログイン機能を実装してください";
      
      const result = recommendMode(codeTask);
      
      expect(result.mode).toBe("code");
    });

    it("should recommend debug mode for debugging tasks", () => {
      const debugTask = "アプリケーションのバグを修正してください";
      
      const result = recommendMode(debugTask);
      
      expect(result.mode).toBe("debug");
    });

    it("should recommend ask mode for questions", () => {
      const questionTask = "Reactの使い方を教えてください";
      
      const result = recommendMode(questionTask);
      
      expect(result.mode).toBe("ask");
    });

    it("should recommend orchestrator mode for complex tasks", () => {
      const complexTask = "複数のマイクロサービスを統合したシステムを構築してください";
      
      const result = recommendMode(complexTask);
      
      expect(result.mode).toBe("orchestrator");
    });
  });

  describe("decomposeComplexTask", () => {
    it("should decompose system development task", () => {
      const systemTask = "新しいユーザー認証システムを設計、実装、テストしてください";
      
      const result = decomposeComplexTask(systemTask);
      
      expect(result.length).toBeGreaterThan(1);
      
      const designTask = result.find(t => t.mode === "architect");
      const implementationTask = result.find(t => t.mode === "code");
      const testingTask = result.find(t => t.mode === "debug");
      
      expect(designTask).toBeDefined();
      expect(implementationTask).toBeDefined();
      expect(testingTask).toBeDefined();
      
      if (testingTask && implementationTask) {
        expect(testingTask.dependencies).toContain("implementation");
      }
    });

    it("should handle tasks with documentation requirements", () => {
      const docTask = "APIを実装し、ドキュメントを作成してください";
      
      const result = decomposeComplexTask(docTask);
      
      const docSubTask = result.find(t => t.mode === "ask");
      expect(docSubTask).toBeDefined();
    });

    it("should assign appropriate priorities", () => {
      const fullTask = "システム設計、実装、テスト、ドキュメント作成を行ってください";
      
      const result = decomposeComplexTask(fullTask);
      
      const priorities = result.map(t => t.priority).sort((a, b) => a - b);
      expect(priorities).toEqual([1, 2, 3, 4]);
    });

    it("should create single task for simple descriptions", () => {
      const simpleTask = "ファイルを修正してください";
      
      const result = decomposeComplexTask(simpleTask);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("main");
    });
  });

  describe("analyzeTask", () => {
    it("should provide comprehensive analysis for complex tasks", () => {
      const complexTask = "新しいWebアプリケーションのシステム設計、実装、テストを行ってください";
      
      const result = analyzeTask(complexTask);
      
      expect(result.complexity.level).toBe("complex");
      expect(result.requiresOrchestration).toBe(true);
      expect(result.subTasks.length).toBeGreaterThan(1);
      expect(result.recommendedMode.mode).toBeDefined();
    });

    it("should provide simple analysis for basic tasks", () => {
      const simpleTask = "README.mdを更新してください";
      
      const result = analyzeTask(simpleTask);
      
      expect(result.complexity.level).toBe("simple");
      expect(result.requiresOrchestration).toBe(false);
      expect(result.subTasks.length).toBe(0);
    });

    it("should include confidence scores", () => {
      const task = "データベースを設計してください";
      
      const result = analyzeTask(task);
      
      expect(result.recommendedMode.confidence).toBeGreaterThan(0);
      expect(result.recommendedMode.confidence).toBeLessThanOrEqual(100);
    });

    it("should provide reasoning for recommendations", () => {
      const task = "バグを修正してください";
      
      const result = analyzeTask(task);
      
      expect(result.recommendedMode.reasoning).toBeDefined();
      expect(result.recommendedMode.reasoning.length).toBeGreaterThan(0);
    });
  });
});