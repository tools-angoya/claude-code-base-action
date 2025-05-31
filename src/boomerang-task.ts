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

export function detectBoomerangTask(
  content: string,
  customPrompts?: Map<string, string>,
): BoomerangTaskConfig | null {
  const boomerangPatterns = [
    { pattern: /\/architect\s+(.+)/i, mode: "architect" },
    { pattern: /\/debug\s+(.+)/i, mode: "debug" },
    { pattern: /\/ask\s+(.+)/i, mode: "ask" },
    { pattern: /\/orchestrator\s+(.+)/i, mode: "orchestrator" },
    { pattern: /\/code\s+(.+)/i, mode: "code" },
  ];

  if (customPrompts) {
    for (const slug of customPrompts.keys()) {
      const pattern = new RegExp(`\\/${slug}\\s+(.+)`, "i");
      boomerangPatterns.push({ pattern, mode: slug });
    }
  }

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
  const modeEmoji =
    {
      architect: "🏗️",
      code: "💻",
      debug: "🪲",
      ask: "❓",
      orchestrator: "🪃",
    }[config.targetMode] || "📋";

  return `# 🪃 ブーメランタスク

**元のプロンプト:**
${originalPrompt}

---

## 📋 委譲されたタスク

**使用モード**: ${modeEmoji} **${config.targetMode}モード**
**タスク内容**: ${config.taskDescription} (${config.targetMode})
**トリガーフレーズ**: \`${config.triggerPhrase}\`

このタスクは元のClaudeCodeActionから **${config.targetMode}モード** に委譲されました。指定されたタスクを完了し、結果を提供してください。

## 🎯 実行指示

1. 上記のタスクを **${config.targetMode}モード** で実行してください
2. 実行結果を詳細に報告してください
3. 必要に応じて、元のコンテキストを参照してください
4. モード固有の機能を最大限活用してください

## 📚 元のコンテキスト

${originalPrompt}`;
}

export async function processBoomerangTask(
  promptPath: string,
  customPrompts?: Map<string, string>,
): Promise<BoomerangTaskResult> {
  try {
    const promptContent = await readFile(promptPath, "utf-8");
    const boomerangConfig = detectBoomerangTask(promptContent, customPrompts);

    if (!boomerangConfig) {
      return { isBoomerangTask: false };
    }

    console.log(
      `🪃 ブーメランタスクを検出しました: ${boomerangConfig.targetMode}モードへの委譲`,
    );
    console.log(`タスク: ${boomerangConfig.taskDescription}`);

    const modifiedPrompt = createBoomerangTaskPrompt(
      boomerangConfig,
      promptContent,
    );

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
  const modeEmoji =
    {
      architect: "🏗️",
      code: "💻",
      debug: "🪲",
      ask: "❓",
      orchestrator: "🪃",
    }[config.targetMode] || "📋";

  return `🪃 **ブーメランタスク** - 新しいタスクを作成してください:

**使用モード**: ${modeEmoji} \`${config.targetMode}\`
**タスク内容**: ${config.taskDescription} (${config.targetMode})

---
**📝 タスク詳細:**
- **委譲元**: ClaudeCodeAction
- **実行モード**: **${config.targetMode}モード**
- **タスクタイプ**: ブーメランタスク（手動モード指定）

このタスクは元のClaudeCodeActionから **${config.targetMode}モード** に委譲されたブーメランタスクです。`;
}
