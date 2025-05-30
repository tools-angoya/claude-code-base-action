import { existsSync, statSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createAutoOrchestrator } from "./auto-orchestrator";
import { processBoomerangTask } from "./boomerang-task";
import { CustomModeLoader } from "./custom-mode-loader";
import type { TaskAnalysisResult } from "./task-analyzer";
import { analyzeTask } from "./task-analyzer";

export type PreparePromptInput = {
  prompt: string;
  promptFile: string;
};

export type PreparePromptConfig = {
  type: "file" | "inline";
  path: string;
  isBoomerangTask?: boolean;
  boomerangConfig?: any;
  isAutoOrchestrated?: boolean;
  taskAnalysis?: TaskAnalysisResult;
  orchestrationResult?: string;
};

async function validateAndPreparePrompt(
  input: PreparePromptInput,
): Promise<PreparePromptConfig> {
  if (!input.prompt && !input.promptFile) {
    throw new Error(
      "Neither 'prompt' nor 'prompt_file' was provided. At least one is required.",
    );
  }

  if (input.prompt && input.promptFile) {
    throw new Error(
      "Both 'prompt' and 'prompt_file' were provided. Please specify only one.",
    );
  }

  if (input.promptFile) {
    if (!existsSync(input.promptFile)) {
      throw new Error(`Prompt file '${input.promptFile}' does not exist.`);
    }

    const stats = statSync(input.promptFile);
    if (stats.size === 0) {
      throw new Error(
        "Prompt file is empty. Please provide a non-empty prompt.",
      );
    }

    return {
      type: "file",
      path: input.promptFile,
    };
  }

  if (!input.prompt || input.prompt.trim().length === 0) {
    throw new Error("Prompt is empty. Please provide a non-empty prompt.");
  }

  const inlinePath = "/tmp/claude-action/prompt.txt";
  return {
    type: "inline",
    path: inlinePath,
  };
}

async function createTemporaryPromptFile(
  prompt: string,
  promptPath: string,
): Promise<void> {
  const dirPath = promptPath.substring(0, promptPath.lastIndexOf("/"));
  await mkdir(dirPath, { recursive: true });

  const commitInstruction =
    "\n\n重要: コミットを行った場合、コミットハッシュを出力してください。コミットハッシュは完全な40文字の形式で出力し、バッククォートやコードブロックで囲まないでください。";
  const enhancedPrompt = prompt + commitInstruction;

  await writeFile(promptPath, enhancedPrompt);
}

export async function preparePrompt(
  input: PreparePromptInput,
): Promise<PreparePromptConfig> {
  const config = await validateAndPreparePrompt(input);

  if (config.type === "inline") {
    await createTemporaryPromptFile(input.prompt, config.path);
  } else if (config.type === "file") {
    const originalContent = await readFile(config.path, "utf-8");
    const enhancedPromptPath = "/tmp/claude-action/enhanced-prompt.txt";
    await createTemporaryPromptFile(originalContent, enhancedPromptPath);
    config.path = enhancedPromptPath;
  }

  const customModeLoader = new CustomModeLoader();
  const customPrompts = await customModeLoader.loadCustomPrompts();

  const boomerangResult = await processBoomerangTask(
    config.path,
    customPrompts,
  );

  if (boomerangResult.isBoomerangTask && boomerangResult.modifiedPrompt) {
    const boomerangPromptPath = "/tmp/claude-action/boomerang-prompt.txt";
    await createTemporaryPromptFile(
      boomerangResult.modifiedPrompt,
      boomerangPromptPath,
    );

    return {
      ...config,
      path: boomerangPromptPath,
      isBoomerangTask: true,
      boomerangConfig: boomerangResult.config,
    };
  }

  const shouldUseAutoOrchestration =
    process.env.CLAUDE_AUTO_ORCHESTRATION === "1";

  if (shouldUseAutoOrchestration) {
    const taskDescription = input.prompt || input.promptFile;
    const taskAnalysis = await analyzeTask(
      taskDescription,
      true,
      customPrompts,
    );

    console.log(
      `🎯 タスク分析結果: 複雑度=${taskAnalysis.complexity.level}, 推奨モード=${taskAnalysis.recommendedMode.mode}`,
    );

    if (taskAnalysis.requiresOrchestration) {
      console.log(`🔄 自動オーケストレーションを開始します`);

      const orchestrator = createAutoOrchestrator();
      const orchestrationResult =
        await orchestrator.orchestrateTask(taskDescription);

      const orchestratedPromptPath =
        "/tmp/claude-action/orchestrated-prompt.txt";
      await createTemporaryPromptFile(
        orchestrationResult.finalResult,
        orchestratedPromptPath,
      );

      return {
        ...config,
        path: orchestratedPromptPath,
        isAutoOrchestrated: true,
        taskAnalysis,
        orchestrationResult: orchestrationResult.finalResult,
      };
    }
  }

  return config;
}
