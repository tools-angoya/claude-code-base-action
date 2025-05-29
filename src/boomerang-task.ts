import { readFile } from "fs/promises";

export interface BoomerangTaskConfig {
  targetMode: string;
  taskDescription: string;
  triggerPhrase: string;
}

export interface BoomerangTaskResult {
  isBoomerangTask: boolean;
  config?: BoomerangTaskConfig;
  modifiedPrompt?: string;
}

export function detectBoomerangTask(content: string): BoomerangTaskConfig | null {
  const boomerangPatterns = [
    { pattern: /\/architect\s+(.+)/i, mode: "architect" },
    { pattern: /\/debug\s+(.+)/i, mode: "debug" },
    { pattern: /\/ask\s+(.+)/i, mode: "ask" },
    { pattern: /\/orchestrator\s+(.+)/i, mode: "orchestrator" },
    { pattern: /\/code\s+(.+)/i, mode: "code" },
  ];

  for (const { pattern, mode } of boomerangPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return {
        targetMode: mode,
        taskDescription: match[1].trim(),
        triggerPhrase: match[0],
      };
    }
  }

  return null;
}

export function createBoomerangTaskPrompt(
  config: BoomerangTaskConfig,
  originalPrompt: string,
): string {
  return `# ブーメランタスク

**元のプロンプト:**
${originalPrompt}

**委譲されたタスク:**
${config.taskDescription}

**対象モード:** ${config.targetMode}

このタスクは元のClaudeCodeActionから委譲されました。指定されたタスクを完了し、結果を提供してください。

## 指示

1. 上記のタスクを${config.targetMode}モードで実行してください
2. 実行結果を詳細に報告してください
3. 必要に応じて、元のコンテキストを参照してください

## 元のコンテキスト

${originalPrompt}`;
}

export async function processBoomerangTask(promptPath: string): Promise<BoomerangTaskResult> {
  try {
    const promptContent = await readFile(promptPath, "utf-8");
    const boomerangConfig = detectBoomerangTask(promptContent);
    
    if (!boomerangConfig) {
      return { isBoomerangTask: false };
    }

    console.log(`🪃 ブーメランタスクを検出しました: ${boomerangConfig.targetMode}モードへの委譲`);
    console.log(`タスク: ${boomerangConfig.taskDescription}`);

    const modifiedPrompt = createBoomerangTaskPrompt(boomerangConfig, promptContent);

    return {
      isBoomerangTask: true,
      config: boomerangConfig,
      modifiedPrompt,
    };
  } catch (error) {
    console.error("ブーメランタスク処理エラー:", error);
    return { isBoomerangTask: false };
  }
}

export function createNewTaskInstruction(config: BoomerangTaskConfig): string {
  return `新しいタスクを作成してください:

モード: ${config.targetMode}
メッセージ: ${config.taskDescription}

このタスクは元のClaudeCodeActionから委譲されたブーメランタスクです。`;
}