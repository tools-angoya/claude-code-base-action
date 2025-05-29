export interface TaskComplexity {
  level: 'simple' | 'complex';
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
}

export interface TaskAnalysisResult {
  complexity: TaskComplexity;
  recommendedMode: ModeRecommendation;
  subTasks: SubTask[];
  requiresOrchestration: boolean;
}

const COMPLEXITY_KEYWORDS = {
  high: [
    'システム', 'アーキテクチャ', '設計', '実装', 'テスト', 'デバッグ',
    'フルスタック', 'データベース', 'API', 'セキュリティ', '認証',
    'パフォーマンス', 'スケーラビリティ', 'マイクロサービス',
    'CI/CD', 'デプロイ', 'インフラ', 'クラウド', 'Docker', 'Kubernetes'
  ],
  medium: [
    'コンポーネント', '機能', 'モジュール', 'ライブラリ', 'フレームワーク',
    'UI', 'UX', 'フロントエンド', 'バックエンド', 'REST', 'GraphQL'
  ],
  low: [
    'バグ修正', 'スタイル', 'CSS', 'HTML', 'ドキュメント', 'README',
    'コメント', 'リファクタリング', '最適化'
  ]
};

const MODE_PATTERNS = {
  architect: [
    '設計', 'アーキテクチャ', '構造', '計画', 'システム設計',
    'データベース設計', 'API設計', '要件定義', '仕様書'
  ],
  code: [
    '実装', 'コード', 'プログラム', '開発', '作成', '構築',
    'ファイル作成', 'クラス', '関数', 'メソッド'
  ],
  debug: [
    'デバッグ', 'バグ', 'エラー', '問題', '修正', 'トラブルシューティング',
    'テスト', '検証', '確認'
  ],
  ask: [
    '質問', '説明', '教えて', 'どうやって', 'なぜ', '方法',
    'ヘルプ', 'サポート', '情報', '調査'
  ],
  orchestrator: [
    '複数', '統合', '連携', 'ワークフロー', 'パイプライン',
    '自動化', 'オーケストレーション', '管理'
  ]
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

  const sentenceCount = text.split(/[.。!！?？]/).filter(s => s.trim().length > 0).length;
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
    level: score >= 5 ? 'complex' : 'simple',
    score,
    reasons
  };
}

export function recommendMode(taskDescription: string): ModeRecommendation {
  const text = taskDescription.toLowerCase();
  const modeScores: Record<string, number> = {
    architect: 0,
    code: 0,
    debug: 0,
    ask: 0,
    orchestrator: 0
  };

  for (const [mode, patterns] of Object.entries(MODE_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase()) && mode in modeScores) {
        const modeKey = mode as keyof typeof modeScores;
        modeScores[modeKey] = (modeScores[modeKey] || 0) + 1;
      }
    }
  }

  const complexity = analyzeTaskComplexity(taskDescription);
  if (complexity.level === 'complex') {
    modeScores.orchestrator = (modeScores.orchestrator || 0) + 2;
  }

  const bestMode = Object.entries(modeScores).reduce((a, b) =>
    a[1] > b[1] ? a : b
  );

  const totalScore = Object.values(modeScores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? (bestMode[1] / totalScore) * 100 : 50;

  return {
    mode: bestMode[0],
    confidence,
    reasoning: `キーワード分析に基づく推奨（スコア: ${modeScores[bestMode[0]]}/${totalScore}）`
  };
}

export function decomposeComplexTask(taskDescription: string): SubTask[] {
  const text = taskDescription.toLowerCase();
  const subTasks: SubTask[] = [];

  if (text.includes('システム') || text.includes('アーキテクチャ') || text.includes('設計')) {
    subTasks.push({
      id: 'design',
      description: 'システム設計とアーキテクチャの策定',
      mode: 'architect',
      priority: 1,
      dependencies: [],
      estimatedComplexity: 3
    });
  }

  if (text.includes('実装') || text.includes('開発') || text.includes('コード')) {
    subTasks.push({
      id: 'implementation',
      description: 'コードの実装と開発',
      mode: 'code',
      priority: 2,
      dependencies: subTasks.length > 0 ? ['design'] : [],
      estimatedComplexity: 4
    });
  }

  if (text.includes('テスト') || text.includes('検証') || text.includes('デバッグ')) {
    subTasks.push({
      id: 'testing',
      description: 'テストとデバッグの実行',
      mode: 'debug',
      priority: 3,
      dependencies: ['implementation'],
      estimatedComplexity: 2
    });
  }

  if (text.includes('ドキュメント') || text.includes('説明') || text.includes('README')) {
    subTasks.push({
      id: 'documentation',
      description: 'ドキュメントの作成と説明',
      mode: 'ask',
      priority: 4,
      dependencies: ['implementation'],
      estimatedComplexity: 1
    });
  }

  if (subTasks.length === 0) {
    const recommendedMode = recommendMode(taskDescription);
    subTasks.push({
      id: 'main',
      description: taskDescription,
      mode: recommendedMode.mode,
      priority: 1,
      dependencies: [],
      estimatedComplexity: 2
    });
  }

  return subTasks;
}

export function analyzeTask(taskDescription: string): TaskAnalysisResult {
  const complexity = analyzeTaskComplexity(taskDescription);
  const recommendedMode = recommendMode(taskDescription);
  const subTasks = complexity.level === 'complex' 
    ? decomposeComplexTask(taskDescription)
    : [];

  return {
    complexity,
    recommendedMode,
    subTasks,
    requiresOrchestration: complexity.level === 'complex' && subTasks.length > 1
  };
}