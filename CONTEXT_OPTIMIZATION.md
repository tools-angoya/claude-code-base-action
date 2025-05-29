# コンテキスト自動最適化機能

Orchestratorモードでサブタスクに引き継ぐコンテキストを自動で絞り込み、最適化する機能です。

## 概要

この機能は、前のサブタスクの結果から次のサブタスクに必要なコンテキストのみを自動抽出・要約し、トークン効率を向上させながら重要な情報を保持します。

## 主要コンポーネント

### 1. コンテキスト分析機能 (`context-analyzer.ts`)

前のサブタスク結果を分析し、重要な情報を抽出します。

```typescript
import { analyzeContextFromResults, filterContextForMode } from './context-analyzer';

const previousResults = ["サブタスク1の結果", "サブタスク2の結果"];
const analyzedContext = analyzeContextFromResults(previousResults);

// 特定のモード向けにフィルタリング
const filteredItems = filterContextForMode(analyzedContext, "code", 20);
```

**分類されるコンテキストタイプ:**
- `technical_detail`: 技術的詳細（API、データベース、フレームワークなど）
- `file_change`: ファイル変更情報
- `design_decision`: 設計決定
- `error_info`: エラー情報
- `result_summary`: 結果要約
- `dependency_info`: 依存関係情報

### 2. コンテキスト要約機能 (`context-summarizer.ts`)

長いコンテキストを簡潔に要約し、重要度に基づいて情報を優先順位付けします。

```typescript
import { summarizeContext, createContextSummaryForMode } from './context-summarizer';

const summary = summarizeContext(analyzedContext, {
  maxLength: 2000,
  priorityThreshold: 0.7,
  groupByType: true
});

// モード固有の要約
const modeSummary = createContextSummaryForMode(analyzedContext, "architect", 1500);
```

### 3. 自動コンテキスト生成機能 (`auto-context-generator.ts`)

サブタスク作成時の自動コンテキスト生成を行います。

```typescript
import { generateOptimizedContext, createContextForSubTask } from './auto-context-generator';

const optimizedContext = await generateOptimizedContext({
  previousResults: ["前のタスク結果1", "前のタスク結果2"],
  nextTaskType: "code",
  nextTaskGoal: "統合テストの実装",
  config: {
    maxTokens: 1500,
    enableAutoContext: true
  }
});

console.log(`生成されたコンテキスト: ${optimizedContext.optimizedContext}`);
console.log(`推定トークン数: ${optimizedContext.metadata.estimatedTokens}`);
```

### 4. 設定とカスタマイズ (`context-config.ts`)

コンテキスト抽出ルールとモード別戦略を設定できます。

```typescript
import { DEFAULT_CONTEXT_CONFIG, createCustomStrategy } from './context-config';

// カスタム戦略の作成
const customStrategy = createCustomStrategy(
  "performance_focused",
  "パフォーマンス重視の戦略",
  [
    {
      name: "performance_metrics",
      pattern: /パフォーマンス|performance|速度|最適化/gi,
      type: "technical_detail",
      importance: 1.0,
      applicableModes: ["code", "architect"]
    }
  ],
  { code: 1200, architect: 1800 }
);
```

## 使用方法

### 基本的な使用

```typescript
import { AutoOrchestrator } from './auto-orchestrator';

const orchestrator = new AutoOrchestrator({
  enableAutoContext: true,
  maxContextTokens: 1500,
  preserveAllResults: true
});

const result = await orchestrator.orchestrateTask(
  "Webアプリケーションの認証機能を実装してください"
);
```

### 高度な設定

```typescript
import { AutoOrchestrator } from './auto-orchestrator';
import { mergeContextConfigs, DEFAULT_CONTEXT_CONFIG } from './context-config';

const customConfig = mergeContextConfigs(DEFAULT_CONTEXT_CONFIG, {
  defaultStrategy: "minimal",
  modeSpecificSettings: {
    code: {
      maxTokens: 1200,
      prioritizeRecent: true,
      preserveErrorInfo: true,
      includeFileChanges: true
    }
  }
});

const orchestrator = new AutoOrchestrator({
  enableAutoContext: true,
  maxContextTokens: 1200,
  preserveAllResults: true
});
```

## 設定可能な戦略

### 1. Balanced戦略（デフォルト）
全てのコンテキストタイプをバランス良く保持します。

### 2. Minimal戦略
最小限の重要な情報のみを保持し、トークン使用量を最小化します。

### 3. Comprehensive戦略
可能な限り多くの情報を保持し、詳細なコンテキストを提供します。

## モード別の最適化

各モードに応じてコンテキストの重要度が自動調整されます：

- **Architectモード**: 設計決定、技術的詳細、依存関係情報を重視
- **Codeモード**: ファイル変更、技術的詳細、エラー情報を重視
- **Debugモード**: エラー情報、技術的詳細、ファイル変更を重視
- **Askモード**: 結果要約、技術的詳細を重視
- **Orchestratorモード**: 結果要約、依存関係情報、設計決定を重視

## パフォーマンス指標

生成されたコンテキストには以下のメタデータが含まれます：

```typescript
{
  originalItemCount: 45,        // 元のアイテム数
  filteredItemCount: 12,        // フィルタリング後のアイテム数
  estimatedTokens: 1247,        // 推定トークン数
  compressionRatio: 0.23,       // 圧縮率
  includedTypes: ["technical_detail", "file_change", "error_info"]
}
```

## トラブルシューティング

### コンテキスト生成に失敗する場合

1. `enableAutoContext`が`true`に設定されているか確認
2. `maxContextTokens`が適切な値に設定されているか確認
3. 前のタスク結果が空でないか確認

### トークン制限を超過する場合

1. `maxContextTokens`を調整
2. より厳しいフィルタリング戦略（`minimal`）を使用
3. `priorityThreshold`を上げて重要度の低い情報を除外

### 重要な情報が欠落する場合

1. `preserveErrorInfo`を`true`に設定
2. カスタム抽出ルールを追加
3. より包括的な戦略（`comprehensive`）を使用

## 例：実際の使用シナリオ

```typescript
// 1. Webアプリケーション開発プロジェクト
const webAppOrchestrator = new AutoOrchestrator({
  enableAutoContext: true,
  maxContextTokens: 2000,
  preserveAllResults: true
});

const result = await webAppOrchestrator.orchestrateTask(`
  ユーザー認証機能付きのTodoアプリを作成してください。
  - React + TypeScriptでフロントエンド
  - Node.js + Expressでバックエンド
  - JWTトークンベースの認証
  - PostgreSQLデータベース
`);

// 2. バグ修正プロジェクト
const debugOrchestrator = new AutoOrchestrator({
  enableAutoContext: true,
  maxContextTokens: 1200,
  preserveAllResults: true
});

const debugResult = await debugOrchestrator.orchestrateTask(`
  APIレスポンスが500エラーを返す問題を調査・修正してください。
  エラーログ: "Database connection timeout"
`);
```

この機能により、Orchestratorモードでのサブタスク間の情報伝達が大幅に改善され、より効率的で一貫性のあるタスク実行が可能になります。