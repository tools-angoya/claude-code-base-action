import type { AnalyzedContext, ContextItem } from "./context-analyzer";
import {
  analyzeContextFromResults,
  filterContextForMode,
} from "./context-analyzer";
import {
  adjustSummaryForTokenLimit,
  createContextSummaryForMode,
} from "./context-summarizer";

export interface ContextGenerationConfig {
  maxTokens: number;
  includeHistory: boolean;
  prioritizeRecent: boolean;
  modeSpecificFiltering: boolean;
  preserveErrorInfo: boolean;
  includeFileChanges: boolean;
}

export interface GeneratedContext {
  optimizedContext: string;
  metadata: {
    originalItemCount: number;
    filteredItemCount: number;
    estimatedTokens: number;
    compressionRatio: number;
    includedTypes: string[];
  };
  debugInfo?: {
    analysisResult: AnalyzedContext;
    filteringSteps: string[];
  };
}

const DEFAULT_CONFIG: ContextGenerationConfig = {
  maxTokens: 1500,
  includeHistory: true,
  prioritizeRecent: true,
  modeSpecificFiltering: true,
  preserveErrorInfo: true,
  includeFileChanges: true,
};

const MODE_TOKEN_LIMITS = {
  architect: 2000,
  code: 1500,
  debug: 1200,
  ask: 1000,
  orchestrator: 1800,
};

const MODE_PRIORITIES = {
  architect: {
    design_decision: 1.5,
    technical_detail: 1.3,
    dependency_info: 1.2,
    result_summary: 1.0,
    file_change: 0.8,
    error_info: 0.7,
  },
  code: {
    file_change: 1.5,
    technical_detail: 1.3,
    error_info: 1.2,
    design_decision: 1.0,
    dependency_info: 0.9,
    result_summary: 0.8,
  },
  debug: {
    error_info: 1.6,
    technical_detail: 1.2,
    file_change: 1.1,
    result_summary: 1.0,
    design_decision: 0.8,
    dependency_info: 0.7,
  },
  ask: {
    result_summary: 1.4,
    technical_detail: 1.1,
    design_decision: 1.0,
    error_info: 0.9,
    file_change: 0.8,
    dependency_info: 0.7,
  },
  orchestrator: {
    result_summary: 1.3,
    dependency_info: 1.2,
    design_decision: 1.1,
    technical_detail: 1.0,
    file_change: 0.9,
    error_info: 0.8,
  },
};

export async function generateOptimizedContext(options: {
  previousResults: string[];
  nextTaskType: string;
  nextTaskGoal: string;
  config?: Partial<ContextGenerationConfig>;
  enableDebug?: boolean;
}): Promise<GeneratedContext> {
  const {
    previousResults,
    nextTaskType,
    nextTaskGoal,
    config = {},
    enableDebug = false,
  } = options;

  const finalConfig = {
    ...DEFAULT_CONFIG,
    maxTokens:
      MODE_TOKEN_LIMITS[nextTaskType as keyof typeof MODE_TOKEN_LIMITS] ||
      DEFAULT_CONFIG.maxTokens,
    ...config,
  };

  const debugInfo: string[] = [];
  debugInfo.push(
    `コンテキスト生成開始: ${nextTaskType}モード, 目標: ${nextTaskGoal}`,
  );

  const analysisResult = analyzeContextFromResults(previousResults, {
    maxItems: 100,
    minImportance: 0.2,
    preferredTypes: getPreferredTypesForMode(nextTaskType),
    modeSpecificWeights: MODE_PRIORITIES,
  });

  debugInfo.push(
    `分析完了: ${analysisResult.items.length}個のコンテキストアイテムを抽出`,
  );

  let filteredItems = analysisResult.items;

  if (finalConfig.modeSpecificFiltering) {
    filteredItems = filterContextForMode(analysisResult, nextTaskType, 50);
    debugInfo.push(
      `モード固有フィルタリング: ${filteredItems.length}個に絞り込み`,
    );
  }

  if (finalConfig.prioritizeRecent) {
    filteredItems = prioritizeRecentItems(filteredItems);
    debugInfo.push(`最新情報の優先順位付け完了`);
  }

  if (finalConfig.preserveErrorInfo) {
    filteredItems = ensureErrorInfoPreservation(
      filteredItems,
      analysisResult.items,
    );
    debugInfo.push(`エラー情報の保持確認完了`);
  }

  const filteredContext: AnalyzedContext = {
    items: filteredItems,
    totalImportance: filteredItems.reduce(
      (sum, item) => sum + item.importance,
      0,
    ),
    categories: categorizeItems(filteredItems),
  };

  let optimizedContext = createContextSummaryForMode(
    filteredContext,
    nextTaskType,
    finalConfig.maxTokens,
  );

  optimizedContext = enhanceContextForTask(
    optimizedContext,
    nextTaskGoal,
    nextTaskType,
  );

  optimizedContext = adjustSummaryForTokenLimit(
    optimizedContext,
    finalConfig.maxTokens,
  );

  const estimatedTokens = estimateTokenCount(optimizedContext);
  debugInfo.push(`最終コンテキスト生成完了: ${estimatedTokens}トークン`);

  const includedTypes = [...new Set(filteredItems.map((item) => item.type))];

  return {
    optimizedContext,
    metadata: {
      originalItemCount: analysisResult.items.length,
      filteredItemCount: filteredItems.length,
      estimatedTokens,
      compressionRatio:
        optimizedContext.length / getTotalContentLength(analysisResult.items),
      includedTypes,
    },
    debugInfo: enableDebug
      ? {
          analysisResult,
          filteringSteps: debugInfo,
        }
      : undefined,
  };
}

function getPreferredTypesForMode(mode: string): string[] {
  const preferences = {
    architect: ["design_decision", "technical_detail", "dependency_info"],
    code: ["file_change", "technical_detail", "error_info"],
    debug: ["error_info", "technical_detail", "file_change"],
    ask: ["result_summary", "technical_detail"],
    orchestrator: ["result_summary", "dependency_info", "design_decision"],
  };

  return (
    preferences[mode as keyof typeof preferences] || [
      "technical_detail",
      "result_summary",
    ]
  );
}

function prioritizeRecentItems(items: ContextItem[]): ContextItem[] {
  const now = new Date();

  return items
    .map((item) => {
      const ageInHours =
        (now.getTime() - item.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyBonus = Math.max(0, 1 - ageInHours / 24) * 0.2;

      return {
        ...item,
        importance: Math.min(1.0, item.importance + recencyBonus),
      };
    })
    .sort((a, b) => b.importance - a.importance);
}

function ensureErrorInfoPreservation(
  filteredItems: ContextItem[],
  allItems: ContextItem[],
): ContextItem[] {
  const errorItems = allItems.filter((item) => item.type === "error_info");
  const highImportanceErrors = errorItems.filter(
    (item) => item.importance >= 0.6,
  );

  const existingErrorIds = new Set(
    filteredItems
      .filter((item) => item.type === "error_info")
      .map((item) => `${item.source}-${item.content.substring(0, 50)}`),
  );

  for (const errorItem of highImportanceErrors) {
    const errorId = `${errorItem.source}-${errorItem.content?.substring(0, 50) || ""}`;
    if (!existingErrorIds.has(errorId)) {
      filteredItems.push(errorItem);
    }
  }

  return filteredItems.sort((a, b) => b.importance - a.importance);
}

function enhanceContextForTask(
  context: string,
  taskGoal: string,
  taskType: string,
): string {
  const taskSpecificPrefix = getTaskSpecificPrefix(taskGoal, taskType);

  if (taskSpecificPrefix) {
    return `${taskSpecificPrefix}\n\n${context}`;
  }

  return context;
}

function getTaskSpecificPrefix(taskGoal: string, taskType: string): string {
  const goalLower = taskGoal.toLowerCase();

  if (goalLower.includes("テスト") || goalLower.includes("test")) {
    return "**テスト関連のタスクです。以下の情報を参考にしてください:**";
  }

  if (
    goalLower.includes("バグ") ||
    goalLower.includes("エラー") ||
    goalLower.includes("修正")
  ) {
    return "**バグ修正・エラー解決のタスクです。以下のエラー情報と技術的詳細を重視してください:**";
  }

  if (
    goalLower.includes("実装") ||
    goalLower.includes("開発") ||
    goalLower.includes("作成")
  ) {
    return "**実装・開発タスクです。以下のファイル変更と技術的詳細を参考にしてください:**";
  }

  if (goalLower.includes("設計") || goalLower.includes("アーキテクチャ")) {
    return "**設計・アーキテクチャタスクです。以下の設計決定と依存関係情報を重視してください:**";
  }

  return "";
}

function categorizeItems(items: ContextItem[]): Record<string, ContextItem[]> {
  const categories: Record<string, ContextItem[]> = {};

  for (const item of items) {
    if (!categories[item.type]) {
      categories[item.type] = [];
    }
    categories[item.type]!.push(item);
  }

  return categories;
}

function getTotalContentLength(items: ContextItem[]): number {
  return items.reduce((total, item) => total + item.content.length, 0);
}

function estimateTokenCount(text: string): number {
  const japaneseCharCount = (
    text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []
  ).length;
  const englishWordCount = (text.match(/[a-zA-Z]+/g) || []).length;
  const symbolCount = (
    text.match(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []
  ).length;

  return Math.ceil(
    japaneseCharCount * 0.5 + englishWordCount + symbolCount * 0.3,
  );
}

export function createContextForSubTask(
  previousTaskResults: string[],
  subTaskDescription: string,
  subTaskMode: string,
  maxTokens?: number,
): Promise<GeneratedContext> {
  return generateOptimizedContext({
    previousResults: previousTaskResults,
    nextTaskType: subTaskMode,
    nextTaskGoal: subTaskDescription,
    config: {
      maxTokens:
        maxTokens ||
        MODE_TOKEN_LIMITS[subTaskMode as keyof typeof MODE_TOKEN_LIMITS] ||
        1500,
    },
  });
}

export function validateContextGeneration(
  generatedContext: GeneratedContext,
  requirements: {
    maxTokens: number;
    requiredTypes?: string[];
    minCompressionRatio?: number;
  },
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (generatedContext.metadata.estimatedTokens > requirements.maxTokens) {
    issues.push(
      `トークン数が制限を超過: ${generatedContext.metadata.estimatedTokens} > ${requirements.maxTokens}`,
    );
    suggestions.push(
      "maxTokensを調整するか、より厳しいフィルタリングを適用してください",
    );
  }

  if (requirements.requiredTypes) {
    const missingTypes = requirements.requiredTypes.filter(
      (type) => !generatedContext.metadata.includedTypes.includes(type),
    );
    if (missingTypes.length > 0) {
      issues.push(`必要なコンテキストタイプが不足: ${missingTypes.join(", ")}`);
      suggestions.push("preferredTypesの設定を調整してください");
    }
  }

  if (
    requirements.minCompressionRatio &&
    generatedContext.metadata.compressionRatio <
      requirements.minCompressionRatio
  ) {
    issues.push(
      `圧縮率が不十分: ${generatedContext.metadata.compressionRatio.toFixed(3)} < ${requirements.minCompressionRatio}`,
    );
    suggestions.push("より積極的な要約設定を使用してください");
  }

  if (generatedContext.metadata.filteredItemCount === 0) {
    issues.push("フィルタリング後のアイテム数が0です");
    suggestions.push("フィルタリング条件を緩和してください");
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

export function getContextGenerationStats(
  generatedContext: GeneratedContext,
): Record<string, any> {
  return {
    efficiency: {
      compressionRatio: generatedContext.metadata.compressionRatio,
      tokenEfficiency:
        generatedContext.metadata.filteredItemCount /
        generatedContext.metadata.estimatedTokens,
      filteringEffectiveness:
        1 -
        generatedContext.metadata.filteredItemCount /
          generatedContext.metadata.originalItemCount,
    },
    coverage: {
      typesCovered: generatedContext.metadata.includedTypes.length,
      typesIncluded: generatedContext.metadata.includedTypes,
      itemsPreserved: generatedContext.metadata.filteredItemCount,
    },
    quality: {
      estimatedTokens: generatedContext.metadata.estimatedTokens,
      contextLength: generatedContext.optimizedContext.length,
      averageItemImportance: "計算が必要",
    },
  };
}
