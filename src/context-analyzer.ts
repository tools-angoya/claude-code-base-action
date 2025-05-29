export interface ContextItem {
  type:
    | "technical_detail"
    | "file_change"
    | "design_decision"
    | "error_info"
    | "result_summary"
    | "dependency_info";
  content: string;
  importance: number;
  relevantModes: string[];
  timestamp: Date;
  source: string;
}

export interface AnalyzedContext {
  items: ContextItem[];
  totalImportance: number;
  categories: Record<string, ContextItem[]>;
}

export interface ContextAnalysisConfig {
  maxItems: number;
  minImportance: number;
  preferredTypes: string[];
  modeSpecificWeights: Record<string, Record<string, number>>;
}

const DEFAULT_CONFIG: ContextAnalysisConfig = {
  maxItems: 50,
  minImportance: 0.3,
  preferredTypes: ["technical_detail", "design_decision", "error_info"],
  modeSpecificWeights: {
    architect: {
      design_decision: 1.5,
      technical_detail: 1.2,
      dependency_info: 1.1,
      file_change: 0.8,
      error_info: 0.7,
      result_summary: 0.9,
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
  },
};

const TECHNICAL_PATTERNS = [
  /API[^a-zA-Z]/i,
  /データベース|database/i,
  /フレームワーク|framework/i,
  /ライブラリ|library/i,
  /アーキテクチャ|architecture/i,
  /パフォーマンス|performance/i,
  /セキュリティ|security/i,
  /認証|authentication/i,
  /設定|config/i,
  /環境|environment/i,
];

const FILE_CHANGE_PATTERNS = [
  /ファイル.*作成|created.*file/i,
  /ファイル.*更新|updated.*file/i,
  /ファイル.*削除|deleted.*file/i,
  /\.ts|\.js|\.py|\.java|\.cpp|\.html|\.css/,
  /src\/|lib\/|components\/|pages\//,
  /package\.json|requirements\.txt|Dockerfile/i,
];

const DESIGN_DECISION_PATTERNS = [
  /設計.*決定|design.*decision/i,
  /アプローチ|approach/i,
  /戦略|strategy/i,
  /パターン|pattern/i,
  /構造|structure/i,
  /選択.*理由|chosen.*because/i,
  /実装.*方針|implementation.*policy/i,
];

const ERROR_PATTERNS = [
  /エラー|error/i,
  /例外|exception/i,
  /失敗|failed/i,
  /問題|problem/i,
  /バグ|bug/i,
  /修正|fix/i,
  /解決|resolve/i,
  /トラブル|trouble/i,
];

const DEPENDENCY_PATTERNS = [
  /依存|depend/i,
  /要求|require/i,
  /前提|prerequisite/i,
  /必要|need/i,
  /関連|related/i,
  /影響|impact/i,
  /連携|integration/i,
];

export function analyzeContextFromResults(
  previousResults: (string | undefined)[],
  config: Partial<ContextAnalysisConfig> = {},
): AnalyzedContext {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const items: ContextItem[] = [];

  for (let i = 0; i < previousResults.length; i++) {
    const result = previousResults[i];
    if (result) {
      const resultItems = extractContextItems(
        result,
        `result-${i}`,
        new Date(),
      );
      items.push(...resultItems);
    }
  }

  const filteredItems = items
    .filter((item) => item.importance >= finalConfig.minImportance)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, finalConfig.maxItems);

  const categories = categorizeItems(filteredItems);
  const totalImportance = filteredItems.reduce(
    (sum, item) => sum + item.importance,
    0,
  );

  return {
    items: filteredItems,
    totalImportance,
    categories,
  };
}

function extractContextItems(
  text: string,
  source: string,
  timestamp: Date,
): ContextItem[] {
  const items: ContextItem[] = [];
  const sentences = text
    .split(/[.。!！?？\n]/)
    .filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) continue;

    const contextType = classifyContextType(trimmed);
    const importance = calculateImportance(trimmed, contextType);
    const relevantModes = determineRelevantModes(trimmed, contextType);

    if (importance > 0.2) {
      items.push({
        type: contextType,
        content: trimmed,
        importance,
        relevantModes,
        timestamp,
        source,
      });
    }
  }

  return items;
}

function classifyContextType(text: string): ContextItem["type"] {
  if (ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
    return "error_info";
  }

  if (FILE_CHANGE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "file_change";
  }

  if (DESIGN_DECISION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "design_decision";
  }

  if (DEPENDENCY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "dependency_info";
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return "technical_detail";
  }

  return "result_summary";
}

function calculateImportance(
  text: string,
  contextType: ContextItem["type"],
): number {
  let importance = 0.5;

  const typeWeights = {
    technical_detail: 0.8,
    file_change: 0.9,
    design_decision: 1.0,
    error_info: 0.7,
    result_summary: 0.6,
    dependency_info: 0.8,
  };

  importance *= typeWeights[contextType];

  if (text.length > 100) importance += 0.1;
  if (text.length > 200) importance += 0.1;

  const technicalTerms = TECHNICAL_PATTERNS.filter((pattern) =>
    pattern.test(text),
  ).length;
  importance += technicalTerms * 0.05;

  if (text.includes("重要") || text.includes("important")) importance += 0.2;
  if (text.includes("注意") || text.includes("warning")) importance += 0.15;
  if (text.includes("必須") || text.includes("required")) importance += 0.15;

  return Math.min(importance, 1.0);
}

function determineRelevantModes(
  text: string,
  contextType: ContextItem["type"],
): string[] {
  const modes: string[] = [];
  const lowerText = text.toLowerCase();

  const modeKeywords = {
    architect: ["設計", "アーキテクチャ", "構造", "計画", "要件"],
    code: ["実装", "コード", "プログラム", "開発", "ファイル"],
    debug: ["デバッグ", "テスト", "エラー", "問題", "修正"],
    ask: ["説明", "質問", "情報", "調査", "ヘルプ"],
    orchestrator: ["統合", "連携", "ワークフロー", "管理", "調整"],
  };

  for (const [mode, keywords] of Object.entries(modeKeywords)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      modes.push(mode);
    }
  }
  const typeToModes: Record<string, string[]> = {
    technical_detail: ["architect", "code"],
    file_change: ["code", "debug"],
    design_decision: ["architect", "orchestrator"],
    error_info: ["debug", "code"],
    result_summary: ["orchestrator", "ask"],
    dependency_info: ["architect", "orchestrator"],
  };

  const typeModes = typeToModes[contextType] || [];
  for (const mode of typeModes) {
    if (!modes.includes(mode)) {
      modes.push(mode);
    }
  }

  return modes.length > 0 ? modes : ["code"];
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

export function filterContextForMode(
  analyzedContext: AnalyzedContext,
  targetMode: string,
  maxItems: number = 20,
): ContextItem[] {
  const config = DEFAULT_CONFIG;
  const modeWeights = config.modeSpecificWeights[targetMode] || {};

  return analyzedContext.items
    .filter((item) => item.relevantModes.includes(targetMode))
    .map((item) => ({
      ...item,
      importance: item.importance * (modeWeights[item.type] || 1.0),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxItems);
}

export function getContextStatistics(
  analyzedContext: AnalyzedContext,
): Record<string, any> {
  const typeStats = Object.entries(analyzedContext.categories).map(
    ([type, items]) => ({
      type,
      count: items.length,
      avgImportance:
        items.reduce((sum, item) => sum + item.importance, 0) / items.length,
      totalImportance: items.reduce((sum, item) => sum + item.importance, 0),
    }),
  );

  return {
    totalItems: analyzedContext.items.length,
    totalImportance: analyzedContext.totalImportance,
    averageImportance:
      analyzedContext.totalImportance / analyzedContext.items.length,
    typeBreakdown: typeStats,
    mostImportantItem: analyzedContext.items[0] || null,
    oldestItem:
      analyzedContext.items.length > 0
        ? analyzedContext.items.reduce((oldest, item) =>
            item.timestamp < oldest.timestamp ? item : oldest,
          )
        : null,
  };
}
