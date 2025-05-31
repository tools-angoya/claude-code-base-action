import { createContextForSubTask } from "./auto-context-generator";
import type { SubTask, TaskAnalysisResult } from "./task-analyzer";
import { analyzeTask } from "./task-analyzer";

export interface OrchestrationConfig {
  maxConcurrentTasks: number;
  timeoutMinutes: number;
  retryAttempts: number;
  enableAutoContext: boolean;
  maxContextTokens: number;
  preserveAllResults: boolean;
}

export interface TaskExecution {
  subTask: SubTask;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: Date;
  endTime?: Date;
  result?: string;
  error?: string;
  retryCount: number;
}

export interface OrchestrationResult {
  success: boolean;
  completedTasks: TaskExecution[];
  failedTasks: TaskExecution[];
  finalResult: string;
  totalExecutionTime: number;
}

export class AutoOrchestrator {
  private config: OrchestrationConfig;
  private executions: Map<string, TaskExecution>;
  private taskResults: string[];

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 3,
      timeoutMinutes: 30,
      retryAttempts: 2,
      enableAutoContext: true,
      maxContextTokens: 1500,
      preserveAllResults: true,
      ...config,
    };
    this.executions = new Map();
    this.taskResults = [];
  }

  async orchestrateTask(taskDescription: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.taskResults = [];

    console.log(`🎯 タスクの自動分析を開始: ${taskDescription}`);

    const analysis = await analyzeTask(taskDescription);

    if (!analysis.requiresOrchestration) {
      console.log(
        `📝 単純なタスクとして処理: ${analysis.recommendedMode.mode}モード`,
      );
      return await this.executeSingleTask(taskDescription, analysis);
    }

    console.log(
      `🔄 複雑なタスクを${analysis.subTasks.length}個のサブタスクに分解`,
    );

    this.initializeExecutions(analysis.subTasks);

    const result = await this.executeSubTasks(analysis);

    const totalTime = Date.now() - startTime;
    result.totalExecutionTime = totalTime;

    console.log(`✅ オーケストレーション完了 (${totalTime}ms)`);

    return result;
  }

  private async executeSingleTask(
    taskDescription: string,
    analysis: TaskAnalysisResult,
  ): Promise<OrchestrationResult> {
    const subTask: SubTask = {
      id: "single",
      description: taskDescription,
      mode: analysis.recommendedMode.mode,
      priority: 1,
      dependencies: [],
      estimatedComplexity: analysis.complexity.score,
    };

    const execution: TaskExecution = {
      subTask,
      status: "pending",
      retryCount: 0,
    };

    try {
      const result = await this.executeTask(execution);

      return {
        success: true,
        completedTasks: [execution],
        failedTasks: [],
        finalResult: result,
        totalExecutionTime: 0,
      };
    } catch (error) {
      execution.status = "failed";
      execution.error = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        completedTasks: [],
        failedTasks: [execution],
        finalResult: `タスク実行に失敗しました: ${execution.error}`,
        totalExecutionTime: 0,
      };
    }
  }

  private initializeExecutions(subTasks: SubTask[]): void {
    this.executions.clear();

    for (const subTask of subTasks) {
      this.executions.set(subTask.id, {
        subTask,
        status: "pending",
        retryCount: 0,
      });
    }
  }

  private async executeSubTasks(
    analysis: TaskAnalysisResult,
  ): Promise<OrchestrationResult> {
    const completedTasks: TaskExecution[] = [];
    const failedTasks: TaskExecution[] = [];
    const results: string[] = [];

    const sortedTasks = this.sortTasksByPriority(analysis.subTasks);

    for (const subTask of sortedTasks) {
      const execution = this.executions.get(subTask.id);
      if (!execution) continue;

      if (!this.areDependenciesMet(subTask, completedTasks)) {
        console.log(`⏳ 依存関係待ち: ${subTask.id}`);
        continue;
      }

      try {
        console.log(
          `🚀 サブタスク実行開始: ${subTask.id} (${subTask.mode}モード)`,
        );

        const result = await this.executeTask(execution);

        execution.status = "completed";
        execution.result = result;
        completedTasks.push(execution);
        results.push(result);

        if (this.config.preserveAllResults) {
          this.taskResults.push(result);
        }

        console.log(`✅ サブタスク完了: ${subTask.id}`);
      } catch (error) {
        console.error(`❌ サブタスク失敗: ${subTask.id}`, error);

        execution.status = "failed";
        execution.error =
          error instanceof Error ? error.message : String(error);

        if (execution.retryCount < this.config.retryAttempts) {
          execution.retryCount++;
          execution.status = "pending";
          console.log(
            `🔄 リトライ ${execution.retryCount}/${this.config.retryAttempts}: ${subTask.id}`,
          );
        } else {
          failedTasks.push(execution);
        }
      }
    }

    const finalResult = this.generateFinalResult(
      completedTasks,
      failedTasks,
      results,
    );

    return {
      success: failedTasks.length === 0,
      completedTasks,
      failedTasks,
      finalResult,
      totalExecutionTime: 0,
    };
  }

  private sortTasksByPriority(subTasks: SubTask[]): SubTask[] {
    return [...subTasks].sort((a, b) => a.priority - b.priority);
  }

  private areDependenciesMet(
    subTask: SubTask,
    completedTasks: TaskExecution[],
  ): boolean {
    const completedIds = new Set(completedTasks.map((t) => t.subTask.id));
    return subTask.dependencies.every((dep) => completedIds.has(dep));
  }

  private async executeTask(execution: TaskExecution): Promise<string> {
    execution.status = "running";
    execution.startTime = new Date();

    await this.createTaskInstruction(execution.subTask);

    const mockResult = await this.simulateTaskExecution(execution.subTask);

    execution.endTime = new Date();

    return mockResult;
  }

  private async createTaskInstruction(subTask: SubTask): Promise<string> {
    let contextSection = "";

    if (this.config.enableAutoContext && this.taskResults.length > 0) {
      try {
        console.log(`🔄 ${subTask.id}のコンテキスト自動生成中...`);

        const generatedContext = await createContextForSubTask(
          this.taskResults,
          subTask.description,
          subTask.mode,
          this.config.maxContextTokens,
        );

        contextSection = `\n\n**前のタスクからの関連情報:**\n${generatedContext.optimizedContext}`;

        console.log(
          `✅ コンテキスト生成完了: ${generatedContext.metadata.estimatedTokens}トークン`,
        );
      } catch (error) {
        console.warn(`⚠️ コンテキスト生成に失敗、基本情報のみ使用: ${error}`);
      }
    }

    const modeEmoji =
      {
        architect: "🏗️",
        code: "💻",
        debug: "🪲",
        ask: "❓",
        orchestrator: "🪃",
      }[subTask.mode] || "📋";

    return `🎯 **自動オーケストレーション** - 新しいタスクを作成してください:

**使用モード**: ${modeEmoji} \`${subTask.mode}\`
**タスクID**: ${subTask.id}
**タスク内容**: ${subTask.description}

---
**📊 タスク詳細:**
- **実行モード**: **${subTask.mode}モード**
- **優先度**: ${subTask.priority}
- **推定複雑度**: ${subTask.estimatedComplexity}
- **依存関係**: ${subTask.dependencies.join(", ") || "なし"}
- **タスクタイプ**: 自動オーケストレーション（AI分析による自動分解）

このタスクは自動オーケストレーションシステムによって **${subTask.mode}モード** で実行するように生成されました。${contextSection}`;
  }

  private async simulateTaskExecution(subTask: SubTask): Promise<string> {
    const delay = subTask.estimatedComplexity * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return `${subTask.mode}モードでタスク「${subTask.description}」を完了しました。`;
  }

  private generateFinalResult(
    completedTasks: TaskExecution[],
    failedTasks: TaskExecution[],
    results: string[],
  ): string {
    const summary = [
      "# 自動オーケストレーション結果",
      "",
      `## 実行サマリー`,
      `- 完了したタスク: ${completedTasks.length}`,
      `- 失敗したタスク: ${failedTasks.length}`,
      `- 成功率: ${Math.round((completedTasks.length / (completedTasks.length + failedTasks.length)) * 100)}%`,
      "",
    ];

    if (completedTasks.length > 0) {
      summary.push("## 完了したタスク");
      for (const task of completedTasks) {
        summary.push(
          `### 📋 ${task.subTask.id} - **${task.subTask.mode}モード**`,
        );
        summary.push(
          `- **説明**: ${task.subTask.description} (${task.subTask.mode})`,
        );
        summary.push(`- **使用モード**: \`${task.subTask.mode}\``);
        summary.push(`- **優先度**: ${task.subTask.priority}`);
        summary.push(`- **推定複雑度**: ${task.subTask.estimatedComplexity}`);
        if (task.subTask.dependencies.length > 0) {
          summary.push(
            `- **依存関係**: ${task.subTask.dependencies.join(", ")}`,
          );
        }
        summary.push(`- **結果**: ${task.result}`);
        summary.push("");
      }
    }

    if (failedTasks.length > 0) {
      summary.push("## 失敗したタスク");
      for (const task of failedTasks) {
        summary.push(
          `### ❌ ${task.subTask.id} - **${task.subTask.mode}モード**`,
        );
        summary.push(
          `- **説明**: ${task.subTask.description} (${task.subTask.mode})`,
        );
        summary.push(`- **使用モード**: \`${task.subTask.mode}\``);
        summary.push(`- **優先度**: ${task.subTask.priority}`);
        summary.push(`- **推定複雑度**: ${task.subTask.estimatedComplexity}`);
        if (task.subTask.dependencies.length > 0) {
          summary.push(
            `- **依存関係**: ${task.subTask.dependencies.join(", ")}`,
          );
        }
        summary.push(`- **エラー**: ${task.error}`);
        summary.push("");
      }
    }

    summary.push("## 統合結果");
    summary.push(results.join("\n\n"));

    return summary.join("\n");
  }
}

export function createAutoOrchestrator(
  config?: Partial<OrchestrationConfig>,
): AutoOrchestrator {
  return new AutoOrchestrator(config);
}
