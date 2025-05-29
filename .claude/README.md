# Claude Custom Modes

このディレクトリには、Claude Code Base Actionで使用するカスタムモード定義ファイルが含まれています。

## 概要

カスタムモード機能により、特定のタスクや専門分野に特化したClaudeの動作を定義できます。各モードは、専門的な知識、指示、ファイルパターンを含む独立した設定ファイルとして定義されます。

## ディレクトリ構造

```
.claude/
├── README.md           # このファイル
├── config.json         # グローバル設定（将来拡張用）
└── modes/              # モード定義ファイル
    ├── security-auditor.md      # セキュリティ監査モード
    ├── performance-optimizer.md # パフォーマンス最適化モード
    └── architect.md             # 拡張アーキテクトモード
```

## 利用可能なモード

### 🔒 Security Auditor (`security-auditor`)
セキュリティ脆弱性の検出と改善提案に特化したモード。
- OWASP Top 10の脆弱性検出
- セキュアコーディングのベストプラクティス
- コンプライアンス要件の評価

### ⚡ Performance Optimizer (`performance-optimizer`)
アプリケーションのパフォーマンス分析と最適化に特化したモード。
- ボトルネックの特定と分析
- アルゴリズムとデータ構造の最適化
- スケーラビリティの改善提案

### 🏗️ Enhanced Architect (`architect`)
既存のアーキテクトモードを拡張した現代的なアーキテクチャガイダンス。
- クラウドネイティブアーキテクチャパターン
- マイクロサービス設計
- 技術戦略と移行計画

## 使用方法

### GitHub Actionsでの使用

```yaml
- name: Run Security Audit
  uses: tools-angoya/claude-code-base-action@main
  with:
    prompt: "Perform a comprehensive security audit"
    mode: "security-auditor"
    allowed_tools: "View,GlobTool,GrepTool,BatchTool"
    use_oauth: "true"
    claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
    claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
    claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}
```

### 自動オーケストレーションでの使用

自動オーケストレーション機能が有効な場合、タスクの内容に基づいて適切なモードが自動選択されます：

```yaml
- name: Auto Orchestrated Task
  uses: tools-angoya/claude-code-base-action@main
  with:
    prompt: "Check this code for security vulnerabilities"
    auto_orchestration: "true"
    # security-auditorモードが自動選択されます
```

## モード定義ファイルの仕様

各モード定義ファイルは以下の構造を持ちます：

```yaml
---
name: "モード名"
slug: "mode-slug"
model: "claude-sonnet-4-20250514"
role: "モードの役割説明"
custom_instructions: "詳細な指示"
file_patterns:
  - "対象ファイルパターン"
description: "モードの説明"
version: "1.0.0"
author: "作成者"
tags:
  - "タグ1"
  - "タグ2"
---

# モードの詳細説明

モードの使用方法や機能の詳細説明をMarkdownで記述
```

## カスタムモードの作成

独自のカスタムモードを作成する場合：

1. `modes/`ディレクトリに新しい`.md`ファイルを作成
2. 上記の仕様に従ってフロントマターを設定
3. モードの詳細説明をMarkdownで記述
4. `slug`フィールドでモードを識別

## 注意事項

- モードファイル名は`slug`と一致させることを推奨
- `file_patterns`は正規表現として解釈されます
- 必須フィールド: `name`, `slug`, `model`, `role`
- サポートされるモデル: `claude-sonnet-4-20250514`, `claude-haiku-4-20250514`, `claude-opus-4-20250514`

詳細な仕様については、プロジェクトルートの`CUSTOM_MODES.md`を参照してください。