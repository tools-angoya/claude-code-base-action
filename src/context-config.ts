export interface ContextExtractionRule {
  name: string;
  pattern: RegExp;
  type:
    | "technical_detail"
    | "file_change"
    | "design_decision"
    | "error_info"
    | "result_summary"
    | "dependency_info";
  importance: number;
  applicableModes: string[];
}

export interface ContextStrategy {
  name: string;
  description: string;
  rules: ContextExtractionRule[];
  tokenLimits: Record<string, number>;
  priorityWeights: Record<string, Record<string, number>>;
}

export interface ContextConfiguration {
  defaultStrategy: string;
  strategies: Record<string, ContextStrategy>;
  globalSettings: {
    maxHistoryItems: number;
    minImportanceThreshold: number;
    enableDebugLogging: boolean;
    fallbackToManualContext: boolean;
  };
  modeSpecificSettings: Record<
    string,
    {
      maxTokens: number;
      prioritizeRecent: boolean;
      preserveErrorInfo: boolean;
      includeFileChanges: boolean;
    }
  >;
}

const DEFAULT_EXTRACTION_RULES: ContextExtractionRule[] = [
  {
    name: "api_references",
    pattern: /API[^a-zA-Z]|エンドポイント|endpoint/gi,
    type: "technical_detail",
    importance: 0.8,
    applicableModes: ["architect", "code"],
  },
  {
    name: "database_operations",
    pattern: /データベース|database|SQL|クエリ|query/gi,
    type: "technical_detail",
    importance: 0.9,
    applicableModes: ["architect", "code", "debug"],
  },
  {
    name: "file_modifications",
    pattern:
      /ファイル.*作成|ファイル.*更新|ファイル.*削除|created.*file|updated.*file|deleted.*file/gi,
    type: "file_change",
    importance: 0.7,
    applicableModes: ["code", "debug"],
  },
  {
    name: "error_messages",
    pattern: /エラー:|error:|例外:|exception:|失敗:|failed:/gi,
    type: "error_info",
    importance: 0.9,
    applicableModes: ["debug", "code"],
  },
  {
    name: "design_decisions",
    pattern: /設計.*決定|design.*decision|アプローチ.*選択|approach.*chosen/gi,
    type: "design_decision",
    importance: 1.0,
    applicableModes: ["architect", "orchestrator"],
  },
  {
    name: "dependency_info",
    pattern: /依存関係|dependency|要求事項|requirement|前提条件|prerequisite/gi,
    type: "dependency_info",
    importance: 0.8,
    applicableModes: ["architect", "orchestrator"],
  },
  {
    name: "performance_metrics",
    pattern: /パフォーマンス|performance|速度|speed|最適化|optimization/gi,
    type: "technical_detail",
    importance: 0.7,
    applicableModes: ["architect", "code", "debug"],
  },
  {
    name: "security_concerns",
    pattern: /セキュリティ|security|認証|authentication|権限|authorization/gi,
    type: "technical_detail",
    importance: 0.9,
    applicableModes: ["architect", "code"],
  },
];

const BALANCED_STRATEGY: ContextStrategy = {
  name: "balanced",
  description: "全てのコンテキストタイプをバランス良く保持する戦略",
  rules: DEFAULT_EXTRACTION_RULES,
  tokenLimits: {
    architect: 2000,
    code: 1500,
    debug: 1200,
    ask: 1000,
    orchestrator: 1800,
  },
  priorityWeights: {
    architect: {
      design_decision: 1.5,
      technical_detail: 1.2,
      dependency_info: 1.1,
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
  },
};

const MINIMAL_STRATEGY: ContextStrategy = {
  name: "minimal",
  description: "最小限の重要な情報のみを保持する戦略",
  rules: DEFAULT_EXTRACTION_RULES.filter((rule) => rule.importance >= 0.8),
  tokenLimits: {
    architect: 1000,
    code: 800,
    debug: 600,
    ask: 500,
    orchestrator: 900,
  },
  priorityWeights: {
    architect: {
      design_decision: 2.0,
      technical_detail: 1.5,
      dependency_info: 1.2,
      result_summary: 0.8,
      file_change: 0.5,
      error_info: 0.5,
    },
    code: {
      file_change: 2.0,
      technical_detail: 1.5,
      error_info: 1.3,
      design_decision: 0.8,
      dependency_info: 0.5,
      result_summary: 0.5,
    },
    debug: {
      error_info: 2.0,
      technical_detail: 1.3,
      file_change: 1.0,
      result_summary: 0.8,
      design_decision: 0.5,
      dependency_info: 0.5,
    },
    ask: {
      result_summary: 1.8,
      technical_detail: 1.0,
      design_decision: 0.8,
      error_info: 0.7,
      file_change: 0.5,
      dependency_info: 0.5,
    },
    orchestrator: {
      result_summary: 1.8,
      dependency_info: 1.5,
      design_decision: 1.2,
      technical_detail: 0.8,
      file_change: 0.5,
      error_info: 0.5,
    },
  },
};

const COMPREHENSIVE_STRATEGY: ContextStrategy = {
  name: "comprehensive",
  description: "可能な限り多くの情報を保持する戦略",
  rules: DEFAULT_EXTRACTION_RULES,
  tokenLimits: {
    architect: 3000,
    code: 2500,
    debug: 2000,
    ask: 1500,
    orchestrator: 2800,
  },
  priorityWeights: {
    architect: {
      design_decision: 1.3,
      technical_detail: 1.2,
      dependency_info: 1.1,
      result_summary: 1.0,
      file_change: 0.9,
      error_info: 0.8,
    },
    code: {
      file_change: 1.3,
      technical_detail: 1.2,
      error_info: 1.1,
      design_decision: 1.0,
      dependency_info: 0.9,
      result_summary: 0.8,
    },
    debug: {
      error_info: 1.4,
      technical_detail: 1.2,
      file_change: 1.1,
      result_summary: 1.0,
      design_decision: 0.9,
      dependency_info: 0.8,
    },
    ask: {
      result_summary: 1.3,
      technical_detail: 1.1,
      design_decision: 1.0,
      error_info: 0.9,
      file_change: 0.8,
      dependency_info: 0.7,
    },
    orchestrator: {
      result_summary: 1.2,
      dependency_info: 1.1,
      design_decision: 1.0,
      technical_detail: 0.9,
      file_change: 0.8,
      error_info: 0.7,
    },
  },
};

export const DEFAULT_CONTEXT_CONFIG: ContextConfiguration = {
  defaultStrategy: "balanced",
  strategies: {
    balanced: BALANCED_STRATEGY,
    minimal: MINIMAL_STRATEGY,
    comprehensive: COMPREHENSIVE_STRATEGY,
  },
  globalSettings: {
    maxHistoryItems: 100,
    minImportanceThreshold: 0.3,
    enableDebugLogging: false,
    fallbackToManualContext: true,
  },
  modeSpecificSettings: {
    architect: {
      maxTokens: 2000,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true,
    },
    code: {
      maxTokens: 1500,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true,
    },
    debug: {
      maxTokens: 1200,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true,
    },
    ask: {
      maxTokens: 1000,
      prioritizeRecent: false,
      preserveErrorInfo: false,
      includeFileChanges: false,
    },
    orchestrator: {
      maxTokens: 1800,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true,
    },
  },
};

export function createCustomStrategy(
  name: string,
  description: string,
  customRules: Partial<ContextExtractionRule>[],
  customTokenLimits?: Partial<Record<string, number>>,
  customWeights?: Partial<Record<string, Record<string, number>>>,
): ContextStrategy {
  const rules = customRules.map((rule) => ({
    name: rule.name || "custom_rule",
    pattern: rule.pattern || /.*/,
    type: rule.type || "technical_detail",
    importance: rule.importance || 0.5,
    applicableModes: rule.applicableModes || ["code"],
  }));

  return {
    name,
    description,
    rules,
    tokenLimits: {
      ...BALANCED_STRATEGY.tokenLimits,
      ...(customTokenLimits || {}),
    } as Record<string, number>,
    priorityWeights: {
      ...BALANCED_STRATEGY.priorityWeights,
      ...(customWeights || {}),
    } as Record<string, Record<string, number>>,
  };
}

export function validateContextConfig(config: ContextConfiguration): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.strategies[config.defaultStrategy]) {
    errors.push(
      `デフォルト戦略 '${config.defaultStrategy}' が定義されていません`,
    );
  }

  for (const [strategyName, strategy] of Object.entries(config.strategies)) {
    if (strategy.rules.length === 0) {
      warnings.push(`戦略 '${strategyName}' にルールが定義されていません`);
    }

    for (const rule of strategy.rules) {
      if (rule.importance < 0 || rule.importance > 1) {
        errors.push(
          `戦略 '${strategyName}' のルール '${rule.name}' の重要度が範囲外です (0-1)`,
        );
      }
    }

    for (const [mode, limit] of Object.entries(strategy.tokenLimits)) {
      if (limit <= 0) {
        errors.push(
          `戦略 '${strategyName}' のモード '${mode}' のトークン制限が無効です`,
        );
      }
    }
  }

  if (config.globalSettings.maxHistoryItems <= 0) {
    errors.push("maxHistoryItemsは正の数である必要があります");
  }

  if (
    config.globalSettings.minImportanceThreshold < 0 ||
    config.globalSettings.minImportanceThreshold > 1
  ) {
    errors.push("minImportanceThresholdは0-1の範囲である必要があります");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getContextConfigForMode(
  config: ContextConfiguration,
  mode: string,
  strategyName?: string,
): {
  strategy: ContextStrategy;
  modeSettings: (typeof config.modeSpecificSettings)[string];
} {
  const targetStrategy = strategyName || config.defaultStrategy;
  const strategy = config.strategies[targetStrategy] || BALANCED_STRATEGY;
  const modeSettings = config.modeSpecificSettings[mode] ||
    config.modeSpecificSettings.code || {
      maxTokens: 1500,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true,
    };

  return {
    strategy,
    modeSettings,
  };
}

export function mergeContextConfigs(
  baseConfig: ContextConfiguration,
  overrideConfig: Partial<ContextConfiguration>,
): ContextConfiguration {
  return {
    defaultStrategy:
      overrideConfig.defaultStrategy || baseConfig.defaultStrategy,
    strategies: {
      ...baseConfig.strategies,
      ...overrideConfig.strategies,
    },
    globalSettings: {
      ...baseConfig.globalSettings,
      ...overrideConfig.globalSettings,
    },
    modeSpecificSettings: {
      ...baseConfig.modeSpecificSettings,
      ...overrideConfig.modeSpecificSettings,
    },
  };
}
