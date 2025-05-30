export interface TaskComplexity {
  level: "simple" | "complex";
  score: number;
  reasons: string[];
}

export interface ModeRecommendation {
  mode: string;
  confidence: number;
  reasoning: string;
}

export interface SubTask {
  id: string;
  description: string;
  mode: string;
  priority: number;
  dependencies: string[];
  estimatedComplexity: number;
  estimatedTime?: string;
}

export interface TaskAnalysisResult {
  complexity: TaskComplexity;
  recommendedMode: ModeRecommendation;
  subTasks: SubTask[];
  requiresOrchestration: boolean;
  usedDynamicDecomposition?: boolean;
}

export interface DynamicDecompositionResult {
  analysis: {
    complexity: "high" | "medium" | "low";
    estimatedTime: string;
    requiredSkills: string[];
  };
  subtasks: Array<{
    id: string;
    description: string;
    mode: "architect" | "code" | "debug" | "ask" | "orchestrator";
    priority: number;
    dependencies: string[];
    estimatedTime: string;
  }>;
}

const COMPLEXITY_KEYWORDS = {
  high: [
    "システム",
    "アーキテクチャ",
    "設計",
    "実装",
    "テスト",
    "デバッグ",
    "フルスタック",
    "データベース",
    "API",
    "セキュリティ",
    "認証",
    "パフォーマンス",
    "スケーラビリティ",
    "マイクロサービス",
    "CI/CD",
    "デプロイ",
    "インフラ",
    "クラウド",
    "Docker",
    "Kubernetes",
  ],
  medium: [
    "コンポーネント",
    "機能",
    "モジュール",
    "ライブラリ",
    "フレームワーク",
    "UI",
    "UX",
    "フロントエンド",
    "バックエンド",
    "REST",
    "GraphQL",
  ],
  low: [
    "バグ修正",
    "スタイル",
    "CSS",
    "HTML",
    "ドキュメント",
    "README",
    "コメント",
    "リファクタリング",
    "最適化",
  ],
};

const MODE_PATTERNS = {
  architect: [
    "設計",
    "アーキテクチャ",
    "構造",
    "計画",
    "システム設計",
    "データベース設計",
    "API設計",
    "要件定義",
    "仕様書",
  ],
  code: [
    "実装",
    "コード",
    "プログラム",
    "開発",
    "作成",
    "構築",
    "ファイル作成",
    "クラス",
    "関数",
    "メソッド",
  ],
  debug: [
    "デバッグ",
    "バグ",
    "エラー",
    "問題",
    "修正",
    "トラブルシューティング",
    "テスト",
    "検証",
    "確認",
  ],
  ask: [
    "質問",
    "説明",
    "教えて",
    "どうやって",
    "なぜ",
    "方法",
    "ヘルプ",
    "サポート",
    "情報",
    "調査",
  ],
  orchestrator: [
    "複数",
    "統合",
    "連携",
    "ワークフロー",
    "パイプライン",
    "自動化",
    "オーケストレーション",
    "管理",
  ],
};

export function analyzeTaskComplexity(taskDescription: string): TaskComplexity {
  const text = taskDescription.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  for (const keyword of COMPLEXITY_KEYWORDS.high) {
    if (text.includes(keyword.toLowerCase())) {
      score += 3;
      reasons.push(`高複雑度キーワード検出: ${keyword}`);
    }
  }

  for (const keyword of COMPLEXITY_KEYWORDS.medium) {
    if (text.includes(keyword.toLowerCase())) {
      score += 2;
      reasons.push(`中複雑度キーワード検出: ${keyword}`);
    }
  }

  for (const keyword of COMPLEXITY_KEYWORDS.low) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
      reasons.push(`低複雑度キーワード検出: ${keyword}`);
    }
  }

  const sentenceCount = text
    .split(/[.。!！?？]/)
    .filter((s) => s.trim().length > 0).length;
  if (sentenceCount > 5) {
    score += 2;
    reasons.push(`長い説明文（${sentenceCount}文）`);
  }

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 50) {
    score += 1;
    reasons.push(`多くの単語数（${wordCount}語）`);
  }

  return {
    level: score >= 5 ? "complex" : "simple",
    score,
    reasons,
  };
}

export function recommendMode(
  taskDescription: string,
  customPrompts?: Map<string, string>,
): ModeRecommendation {
  const text = taskDescription.toLowerCase();
  const modeScores: Record<string, number> = {
    architect: 0,
    code: 0,
    debug: 0,
    ask: 0,
    orchestrator: 0,
  };

  if (customPrompts) {
    for (const slug of customPrompts.keys()) {
      if (!(slug in modeScores)) {
        modeScores[slug] = 0;
      }
    }
  }

  for (const [mode, patterns] of Object.entries(MODE_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase()) && mode in modeScores) {
        const modeKey = mode as keyof typeof modeScores;
        modeScores[modeKey] = (modeScores[modeKey] || 0) + 1;
      }
    }
  }

  const complexity = analyzeTaskComplexity(taskDescription);
  if (complexity.level === "complex") {
    modeScores.orchestrator = (modeScores.orchestrator || 0) + 2;
  }

  const bestMode = Object.entries(modeScores).reduce((a, b) =>
    a[1] > b[1] ? a : b,
  );

  const totalScore = Object.values(modeScores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? (bestMode[1] / totalScore) * 100 : 50;

  return {
    mode: bestMode[0],
    confidence,
    reasoning: `キーワード分析に基づく推奨（スコア: ${modeScores[bestMode[0]]}/${totalScore}）`,
  };
}

export function decomposeComplexTask(taskDescription: string): SubTask[] {
  const text = taskDescription.toLowerCase();
  const subTasks: SubTask[] = [];

  if (
    text.includes("システム") ||
    text.includes("アーキテクチャ") ||
    text.includes("設計")
  ) {
    subTasks.push({
      id: "design",
      description: "システム設計とアーキテクチャの策定",
      mode: "architect",
      priority: 1,
      dependencies: [],
      estimatedComplexity: 3,
    });
  }

  if (
    text.includes("実装") ||
    text.includes("開発") ||
    text.includes("コード")
  ) {
    subTasks.push({
      id: "implementation",
      description: "コードの実装と開発",
      mode: "code",
      priority: 2,
      dependencies: subTasks.length > 0 ? ["design"] : [],
      estimatedComplexity: 4,
    });
  }

  if (
    text.includes("テスト") ||
    text.includes("検証") ||
    text.includes("デバッグ")
  ) {
    subTasks.push({
      id: "testing",
      description: "テストとデバッグの実行",
      mode: "debug",
      priority: 3,
      dependencies: ["implementation"],
      estimatedComplexity: 2,
    });
  }

  if (
    text.includes("ドキュメント") ||
    text.includes("説明") ||
    text.includes("README")
  ) {
    subTasks.push({
      id: "documentation",
      description: "ドキュメントの作成と説明",
      mode: "ask",
      priority: 4,
      dependencies: ["implementation"],
      estimatedComplexity: 1,
    });
  }

  if (subTasks.length === 0) {
    const recommendedMode = recommendMode(taskDescription);
    subTasks.push({
      id: "main",
      description: taskDescription,
      mode: recommendedMode.mode,
      priority: 1,
      dependencies: [],
      estimatedComplexity: 2,
    });
  }

  return subTasks;
}

import { mkdir, writeFile } from "fs/promises";
import { runClaude, type ClaudeOptions } from "./run-claude";

function createDecompositionPrompt(
  taskDescription: string,
  context: string,
): string {
  return `あなたは高度なタスク分解エキスパートです。以下のタスクを分析し、適切なサブタスクに分解してください。
  
  **分析対象タスク:**
  ${taskDescription}
  
  **コンテキスト:**
  ${context}
  
  **利用可能なモード:**
  - 🏗️ **architect**: システム設計、アーキテクチャ策定、要件定義、技術選定
  - 💻 **code**: コード実装、プログラム開発、ファイル作成、機能実装
  - 🪲 **debug**: デバッグ、テスト、問題解決、検証、エラー修正
  - ❓ **ask**: 質問回答、情報提供、説明、調査、ドキュメント作成
  - 🪃 **orchestrator**: 複数タスクの統合、ワークフロー管理、プロジェクト調整
  
  **出力要件:**
  以下のJSON形式で回答してください。各サブタスクには必ず適切なモードを指定してください：
  
  \`\`\`json
  {
    "analysis": {
      "complexity": "high|medium|low",
      "estimatedTime": "分単位での推定時間",
      "requiredSkills": ["必要なスキルのリスト"]
    },
    "subtasks": [
      {
        "id": "task-1",
        "description": "具体的なタスク説明（モード名を含めて明確に記述）",
        "mode": "architect|code|debug|ask|orchestrator",
        "priority": 1,
        "dependencies": [],
        "estimatedTime": "分単位での推定時間"
      }
    ]
  }
  \`\`\`
  
  **分解ガイドライン:**
  1. タスクの複雑度を正確に評価
  2. 各サブタスクは独立性を保ちつつ論理的な順序を維持
  3. 依存関係を明確に定義
  4. 適切なモードを選択（複雑なタスクはarchitectから開始）
  5. 最大5個のサブタスクに制限
  6. 各サブタスクの実行時間を現実的に見積もり
  7. **重要**: 各サブタスクの説明には使用するモード名を明記すること
  
  JSON形式のみで回答し、説明文は含めないでください。`;
}
function parseDecompositionResult(claudeOutput: string): SubTask[] {
  try {
    const lines = claudeOutput.split("\n");
    let jsonContent = "";
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith("```json")) {
        inCodeBlock = true;
        continue;
      }
      if (line.trim() === "```" && inCodeBlock) {
        break;
      }
      if (inCodeBlock) {
        jsonContent += line + "\n";
      }
    }

    if (!jsonContent.trim()) {
      const jsonMatch = claudeOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
    }

    const result: DynamicDecompositionResult = JSON.parse(jsonContent.trim());

    return result.subtasks.map((task) => ({
      id: task.id,
      description: task.description,
      mode: task.mode,
      priority: task.priority,
      dependencies: task.dependencies,
      estimatedComplexity:
        task.mode === "architect"
          ? 3
          : task.mode === "code"
            ? 4
            : task.mode === "debug"
              ? 2
              : task.mode === "orchestrator"
                ? 3
                : 1,
      estimatedTime: task.estimatedTime,
    }));
  } catch (error) {
    console.warn(`動的分解結果の解析に失敗: ${error}`);
    return [];
  }
}

async function decomposeTaskWithClaude(
  taskDescription: string,
  context: string,
): Promise<SubTask[]> {
  try {
    const prompt = createDecompositionPrompt(taskDescription, context);
    const promptPath = "/tmp/claude-action/decomposition-prompt.txt";

    await mkdir("/tmp/claude-action", { recursive: true });
    await writeFile(promptPath, prompt);

    const options: ClaudeOptions = {
      maxTurns: "1",
      allowedTools: "ask_followup_question",
    };

    console.log("🤖 Claude Codeによる動的タスク分解を実行中...");
    await runClaude(promptPath, options);

    const { readFile } = await import("fs/promises");
    const outputContent = await readFile(
      "/tmp/claude-execution-output.json",
      "utf-8",
    );
    const outputData = JSON.parse(outputContent);

    let claudeResponse = "";
    for (const entry of outputData) {
      if (entry.type === "text" && entry.text) {
        claudeResponse += entry.text;
      }
    }

    const subTasks = parseDecompositionResult(claudeResponse);
    console.log(`✅ 動的分解完了: ${subTasks.length}個のサブタスクを生成`);

    return subTasks;
  } catch (error) {
    console.warn(`動的タスク分解に失敗、固定分解にフォールバック: ${error}`);
    return [];
  }
}

export async function analyzeTask(
  taskDescription: string,
  enableDynamicDecomposition: boolean = true,
  customPrompts?: Map<string, string>,
): Promise<TaskAnalysisResult> {
  const complexity = analyzeTaskComplexity(taskDescription);
  const recommendedMode = recommendMode(taskDescription, customPrompts);

  let subTasks: SubTask[] = [];
  let usedDynamicDecomposition = false;

  if (complexity.level === "complex") {
    const dynamicDecompositionEnabled =
      process.env.CLAUDE_DYNAMIC_DECOMPOSITION !== "false" &&
      process.env.CLAUDE_DYNAMIC_DECOMPOSITION !== "0";

    if (enableDynamicDecomposition && dynamicDecompositionEnabled) {
      const context = `複雑度: ${complexity.level}, スコア: ${complexity.score}, 理由: ${complexity.reasons.join(", ")}`;
      const dynamicSubTasks = await decomposeTaskWithClaude(
        taskDescription,
        context,
      );

      if (dynamicSubTasks.length > 0) {
        subTasks = dynamicSubTasks;
        usedDynamicDecomposition = true;
      } else {
        subTasks = decomposeComplexTask(taskDescription);
      }
    } else {
      subTasks = decomposeComplexTask(taskDescription);
    }
  }

  return {
    complexity,
    recommendedMode,
    subTasks,
    requiresOrchestration:
      complexity.level === "complex" && subTasks.length > 1,
    usedDynamicDecomposition,
  };
}

export function analyzeTaskSync(
  taskDescription: string,
  customPrompts?: Map<string, string>,
): TaskAnalysisResult {
  const complexity = analyzeTaskComplexity(taskDescription);
  const recommendedMode = recommendMode(taskDescription, customPrompts);
  const subTasks =
    complexity.level === "complex" ? decomposeComplexTask(taskDescription) : [];

  return {
    complexity,
    recommendedMode,
    subTasks,
    requiresOrchestration:
      complexity.level === "complex" && subTasks.length > 1,
    usedDynamicDecomposition: false,
  };
}
