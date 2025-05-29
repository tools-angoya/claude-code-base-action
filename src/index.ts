#!/usr/bin/env bun

import * as core from "@actions/core";
import { createNewTaskInstruction } from "./boomerang-task";
import { CustomModeLoader } from "./custom-mode-loader";
import { preparePrompt } from "./prepare-prompt";
import { runClaude } from "./run-claude";
import { setupOAuthCredentials } from "./setup-oauth";
import { validateEnvironmentVariables } from "./validate-env";

async function run() {
  try {
    validateEnvironmentVariables();

    if (process.env.INPUT_ENABLE_CUSTOM_MODES !== "false") {
      const customModesDirectory =
        process.env.INPUT_CUSTOM_MODES_DIRECTORY || ".claude/modes";
      const customModeLoader = new CustomModeLoader(customModesDirectory);

      try {
        const customPrompts = await customModeLoader.loadCustomPrompts();
        const successCount = customPrompts.size;

        if (successCount > 0) {
          console.log(`✅ カスタムプロンプトを${successCount}個読み込みました`);
          for (const [slug, _] of customPrompts) {
            console.log(`  - ${slug}モード`);
          }
        }
      } catch (error) {
        console.warn(`カスタムプロンプトの読み込みに失敗しました: ${error}`);
      }
    }

    // Setup OAuth credentials if using OAuth authentication
    if (process.env.CLAUDE_CODE_USE_OAUTH === "1") {
      await setupOAuthCredentials({
        accessToken: process.env.CLAUDE_ACCESS_TOKEN!,
        refreshToken: process.env.CLAUDE_REFRESH_TOKEN!,
        expiresAt: process.env.CLAUDE_EXPIRES_AT!,
      });
    }

    const promptConfig = await preparePrompt({
      prompt: process.env.INPUT_PROMPT || "",
      promptFile: process.env.INPUT_PROMPT_FILE || "",
    });

    if (promptConfig.isBoomerangTask && promptConfig.boomerangConfig) {
      console.log(
        `🪃 ブーメランタスクを実行中: ${promptConfig.boomerangConfig.targetMode}モード`,
      );

      const newTaskInstruction = createNewTaskInstruction(
        promptConfig.boomerangConfig,
      );
      console.log("新しいタスク指示:", newTaskInstruction);

      const allowedTools = process.env.INPUT_ALLOWED_TOOLS
        ? `${process.env.INPUT_ALLOWED_TOOLS},new_task`
        : "new_task";

      await runClaude(promptConfig.path, {
        allowedTools,
        disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
        maxTurns: process.env.INPUT_MAX_TURNS,
        mcpConfig: process.env.INPUT_MCP_CONFIG,
      });
    } else if (promptConfig.isAutoOrchestrated) {
      console.log(`🎯 自動オーケストレーションされたタスクを実行中`);
      console.log(
        `📊 タスク分析: 複雑度=${promptConfig.taskAnalysis?.complexity.level}, 推奨モード=${promptConfig.taskAnalysis?.recommendedMode.mode}`,
      );

      await runClaude(promptConfig.path, {
        allowedTools: process.env.INPUT_ALLOWED_TOOLS,
        disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
        maxTurns: process.env.INPUT_MAX_TURNS,
        mcpConfig: process.env.INPUT_MCP_CONFIG,
      });
    } else {
      await runClaude(promptConfig.path, {
        allowedTools: process.env.INPUT_ALLOWED_TOOLS,
        disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
        maxTurns: process.env.INPUT_MAX_TURNS,
        mcpConfig: process.env.INPUT_MCP_CONFIG,
      });
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    core.setOutput("conclusion", "failure");
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
