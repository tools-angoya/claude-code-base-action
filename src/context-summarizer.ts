import type { AnalyzedContext, ContextItem } from "./context-analyzer";

export interface SummaryConfig {
  maxLength: number;
  priorityThreshold: number;
  includeMetadata: boolean;
  groupByType: boolean;
  preserveImportantDetails: boolean;
}

export interface SummarizedContext {
  summary: string;
  keyPoints: string[];
  metadata: {
    originalItemCount: number;
    summarizedItemCount: number;
    compressionRatio: number;
    mostImportantTypes: string[];
  };
  preservedItems: ContextItem[];
}

const DEFAULT_SUMMARY_CONFIG: SummaryConfig = {
  maxLength: 2000,
  priorityThreshold: 0.7,
  includeMetadata: true,
  groupByType: true,
  preserveImportantDetails: true,
};

const TYPE_DESCRIPTIONS = {
  technical_detail: "技術的詳細",
  file_change: "ファイル変更",
  design_decision: "設計決定",
  error_info: "エラー情報",
  result_summary: "結果要約",
  dependency_info: "依存関係情報",
};

export function summarizeContext(
  analyzedContext: AnalyzedContext,
  config: Partial<SummaryConfig> = {},
): SummarizedContext {
  const finalConfig = { ...DEFAULT_SUMMARY_CONFIG, ...config };

  const highPriorityItems = analyzedContext.items.filter(
    (item) => item.importance >= finalConfig.priorityThreshold,
  );

  const groupedItems = finalConfig.groupByType
    ? groupItemsByType(highPriorityItems)
    : { all: highPriorityItems };

  const summaryParts: string[] = [];
  const keyPoints: string[] = [];
  const preservedItems: ContextItem[] = [];

  for (const [type, items] of Object.entries(groupedItems)) {
    if (items.length === 0) continue;

    const typeSummary = summarizeItemGroup(items, type, finalConfig);

    if (typeSummary.summary) {
      summaryParts.push(typeSummary.summary);
    }

    keyPoints.push(...typeSummary.keyPoints);
    preservedItems.push(...typeSummary.preservedItems);
  }

  let summary = summaryParts.join("\n\n");

  if (summary.length > finalConfig.maxLength) {
    summary = truncateToLength(summary, finalConfig.maxLength);
  }

  const typeFrequency = calculateTypeFrequency(analyzedContext.items);
  const mostImportantTypes = Object.entries(typeFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);

  return {
    summary,
    keyPoints: keyPoints.slice(0, 10),
    metadata: {
      originalItemCount: analyzedContext.items.length,
      summarizedItemCount: preservedItems.length,
      compressionRatio:
        summary.length / getTotalContentLength(analyzedContext.items),
      mostImportantTypes,
    },
    preservedItems,
  };
}

function groupItemsByType(items: ContextItem[]): Record<string, ContextItem[]> {
  const groups: Record<string, ContextItem[]> = {};

  for (const item of items) {
    if (!groups[item.type]) {
      groups[item.type] = [];
    }
    groups[item.type]!.push(item);
  }

  return groups;
}

function summarizeItemGroup(
  items: ContextItem[],
  groupType: string,
  config: SummaryConfig,
): {
  summary: string;
  keyPoints: string[];
  preservedItems: ContextItem[];
} {
  if (items.length === 0) {
    return { summary: "", keyPoints: [], preservedItems: [] };
  }

  const sortedItems = items.sort((a, b) => b.importance - a.importance);
  const topItems = sortedItems.slice(0, Math.min(5, sortedItems.length));

  const typeDescription =
    TYPE_DESCRIPTIONS[groupType as keyof typeof TYPE_DESCRIPTIONS] || groupType;

  let summary = `**${typeDescription}:**\n`;
  const keyPoints: string[] = [];
  const preservedItems: ContextItem[] = [];

  if (groupType === "file_change") {
    summary += summarizeFileChanges(topItems);
  } else if (groupType === "error_info") {
    summary += summarizeErrors(topItems);
  } else if (groupType === "design_decision") {
    summary += summarizeDesignDecisions(topItems);
  } else {
    summary += summarizeGenericItems(topItems);
  }

  for (const item of topItems) {
    if (item.importance >= 0.8) {
      keyPoints.push(extractKeyPoint(item));
      preservedItems.push(item);
    }
  }

  return { summary, keyPoints, preservedItems };
}

function summarizeFileChanges(items: ContextItem[]): string {
  const changes: string[] = [];
  const filePattern = /([^\/\s]+\.(ts|js|py|java|cpp|html|css|json|md))/gi;

  for (const item of items) {
    const files = item.content.match(filePattern) || [];
    const uniqueFiles = [...new Set(files)];

    if (uniqueFiles.length > 0) {
      changes.push(`- ${uniqueFiles.join(", ")} の変更`);
    } else {
      changes.push(`- ${item.content.substring(0, 50)}...`);
    }
  }

  return changes.slice(0, 3).join("\n");
}

function summarizeErrors(items: ContextItem[]): string {
  const errors: string[] = [];

  for (const item of items) {
    const errorMatch = item.content.match(
      /(エラー|error|例外|exception|失敗|failed)[^。.!]*[。.!]?/i,
    );
    if (errorMatch) {
      errors.push(`- ${errorMatch[0]}`);
    } else {
      errors.push(`- ${item.content.substring(0, 60)}...`);
    }
  }

  return errors.slice(0, 3).join("\n");
}

function summarizeDesignDecisions(items: ContextItem[]): string {
  const decisions: string[] = [];

  for (const item of items) {
    const decisionMatch = item.content.match(
      /(設計|アプローチ|戦略|選択)[^。.!]*[。.!]?/i,
    );
    if (decisionMatch) {
      decisions.push(`- ${decisionMatch[0]}`);
    } else {
      decisions.push(`- ${item.content.substring(0, 60)}...`);
    }
  }

  return decisions.slice(0, 3).join("\n");
}

function summarizeGenericItems(items: ContextItem[]): string {
  const summaries: string[] = [];

  for (const item of items) {
    const sentences = item.content
      .split(/[。.!]/)
      .filter((s) => s.trim().length > 10);
    const firstSentence = sentences[0]?.trim();

    if (firstSentence) {
      summaries.push(`- ${firstSentence}`);
    }
  }

  return summaries.slice(0, 3).join("\n");
}

function extractKeyPoint(item: ContextItem): string {
  const content = item.content.trim();

  if (content.length <= 100) {
    return content;
  }

  const sentences = content.split(/[。.!]/).filter((s) => s.trim().length > 5);
  const firstSentence = sentences[0]?.trim();

  if (firstSentence && firstSentence.length <= 100) {
    return firstSentence;
  }

  return content.substring(0, 97) + "...";
}

function truncateToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength - 3);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("。"),
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
  );

  if (lastSentenceEnd > maxLength * 0.7) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  return truncated + "...";
}

function calculateTypeFrequency(items: ContextItem[]): Record<string, number> {
  const frequency: Record<string, number> = {};

  for (const item of items) {
    frequency[item.type] = (frequency[item.type] || 0) + 1;
  }

  return frequency;
}

function getTotalContentLength(items: ContextItem[]): number {
  return items.reduce((total, item) => total + item.content.length, 0);
}

export function createContextSummaryForMode(
  analyzedContext: AnalyzedContext,
  targetMode: string,
  maxLength: number = 1500,
): string {
  const modeSpecificConfig: Partial<SummaryConfig> = {
    maxLength,
    priorityThreshold: 0.6,
    groupByType: true,
    preserveImportantDetails: true,
  };

  if (targetMode === "architect") {
    modeSpecificConfig.priorityThreshold = 0.7;
  } else if (targetMode === "debug") {
    modeSpecificConfig.priorityThreshold = 0.5;
  } else if (targetMode === "code") {
    modeSpecificConfig.priorityThreshold = 0.6;
  }

  const summary = summarizeContext(analyzedContext, modeSpecificConfig);

  const modePrefix = getModeSpecificPrefix(targetMode);

  return `${modePrefix}\n\n${summary.summary}${
    summary.keyPoints.length > 0
      ? `\n\n**重要なポイント:**\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}`
      : ""
  }`;
}

function getModeSpecificPrefix(mode: string): string {
  const prefixes = {
    architect: "**前のタスクからの設計・アーキテクチャ関連情報:**",
    code: "**前のタスクからの実装関連情報:**",
    debug: "**前のタスクからのデバッグ・問題解決関連情報:**",
    ask: "**前のタスクからの情報・調査結果:**",
    orchestrator: "**前のタスクからの統合・管理関連情報:**",
  };

  return (
    prefixes[mode as keyof typeof prefixes] || "**前のタスクからの関連情報:**"
  );
}

export function estimateTokenCount(text: string): number {
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

export function adjustSummaryForTokenLimit(
  summary: string,
  maxTokens: number,
): string {
  const currentTokens = estimateTokenCount(summary);

  if (currentTokens <= maxTokens) {
    return summary;
  }

  const compressionRatio = maxTokens / currentTokens;
  const targetLength = Math.floor(summary.length * compressionRatio * 0.9);

  return truncateToLength(summary, targetLength);
}
