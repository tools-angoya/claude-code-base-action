import { beforeEach, describe, expect, it } from "bun:test";
import { AutoOrchestrator, createAutoOrchestrator } from "../src/auto-orchestrator";
import { analyzeTask } from "../src/task-analyzer";

describe("AutoOrchestrator", () => {
  let orchestrator: AutoOrchestrator;

  beforeEach(() => {
    orchestrator = createAutoOrchestrator({
      maxConcurrentTasks: 2,
      timeoutMinutes: 5,
      retryAttempts: 1,
    });
  });

  describe("orchestrateTask", () => {
    it("should handle simple tasks without orchestration", async () => {
      const taskDescription = "CSSファイルを修正してください";
      
      const result = await orchestrator.orchestrateTask(taskDescription);
      
      expect(result.success).toBe(true);
      expect(result.completedTasks).toHaveLength(1);
      expect(result.failedTasks).toHaveLength(0);
      expect(result.finalResult).toContain("codeモードでタスク");
    });

    it("should orchestrate complex tasks into subtasks", async () => {
      const taskDescription = "新しいユーザー認証システムを実装してください。データベース設計、API実装、テストが必要です。";
      
      const result = await orchestrator.orchestrateTask(taskDescription);
      
      expect(result.success).toBe(true);
      expect(result.completedTasks.length).toBeGreaterThan(1);
      expect(result.finalResult).toContain("自動オーケストレーション結果");
    });

    it("should analyze task complexity correctly", async () => {
      const complexTask = "フルスタックWebアプリケーションを開発してください。React、Node.js、PostgreSQL、Docker、CI/CDパイプラインを含む";
      const simpleTask = "README.mdファイルを更新してください";
      
      const complexAnalysis = analyzeTask(complexTask);
      const simpleAnalysis = analyzeTask(simpleTask);
      
      expect(complexAnalysis.complexity.level).toBe("complex");
      expect(complexAnalysis.requiresOrchestration).toBe(true);
      expect(complexAnalysis.subTasks.length).toBeGreaterThan(1);
      
      expect(simpleAnalysis.complexity.level).toBe("simple");
      expect(simpleAnalysis.requiresOrchestration).toBe(false);
    });

    it("should recommend appropriate modes for different tasks", async () => {
      const designTask = "システムアーキテクチャを設計してください";
      const codeTask = "ログイン機能を実装してください";
      const debugTask = "バグを修正してください";
      const questionTask = "Reactの使い方を教えてください";
      
      const designAnalysis = analyzeTask(designTask);
      const codeAnalysis = analyzeTask(codeTask);
      const debugAnalysis = analyzeTask(debugTask);
      const questionAnalysis = analyzeTask(questionTask);
      
      expect(designAnalysis.recommendedMode.mode).toBe("architect");
      expect(codeAnalysis.recommendedMode.mode).toBe("code");
      expect(debugAnalysis.recommendedMode.mode).toBe("debug");
      expect(questionAnalysis.recommendedMode.mode).toBe("ask");
    });

    it("should handle task dependencies correctly", async () => {
      const taskDescription = "Webアプリケーションを作成し、テストしてください";
      
      const analysis = analyzeTask(taskDescription);
      
      if (analysis.requiresOrchestration) {
        const implementationTask = analysis.subTasks.find(t => t.id === "implementation");
        const testingTask = analysis.subTasks.find(t => t.id === "testing");
        
        if (implementationTask && testingTask) {
          expect(testingTask.dependencies).toContain("implementation");
          expect(testingTask.priority).toBeGreaterThan(implementationTask.priority);
        }
      }
    });

    it("should generate comprehensive final results", async () => {
      const taskDescription = "新しいAPIエンドポイントを設計、実装、テストしてください";
      
      const result = await orchestrator.orchestrateTask(taskDescription);
      
      expect(result.finalResult).toContain("# 自動オーケストレーション結果");
      expect(result.finalResult).toContain("## 実行サマリー");
      expect(result.finalResult).toContain("## 完了したタスク");
      expect(result.finalResult).toContain("## 統合結果");
      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });
  });

  describe("createAutoOrchestrator", () => {
    it("should create orchestrator with default config", () => {
      const defaultOrchestrator = createAutoOrchestrator();
      expect(defaultOrchestrator).toBeInstanceOf(AutoOrchestrator);
    });

    it("should create orchestrator with custom config", () => {
      const customOrchestrator = createAutoOrchestrator({
        maxConcurrentTasks: 5,
        timeoutMinutes: 60,
        retryAttempts: 3,
      });
      expect(customOrchestrator).toBeInstanceOf(AutoOrchestrator);
    });
  });
});