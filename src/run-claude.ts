import * as core from "@actions/core";
import { exec, spawn } from "child_process";
import { createWriteStream } from "fs";
import { stat, unlink, writeFile } from "fs/promises";
import { promisify } from "util";

const execAsync = promisify(exec);

const PIPE_PATH = "/tmp/claude_prompt_pipe";
const EXECUTION_FILE = "/tmp/claude-execution-output.json";
const BASE_ARGS = ["-p", "--verbose", "--output-format", "stream-json"];

export type ClaudeOptions = {
  allowedTools?: string;
  disallowedTools?: string;
  maxTurns?: string;
  mcpConfig?: string;
};

type PreparedConfig = {
  claudeArgs: string[];
  promptPath: string;
};

export function prepareRunConfig(
  promptPath: string,
  options: ClaudeOptions,
): PreparedConfig {
  const claudeArgs = [...BASE_ARGS];

  if (options.allowedTools) {
    claudeArgs.push("--allowedTools", options.allowedTools);
  }
  if (options.disallowedTools) {
    claudeArgs.push("--disallowedTools", options.disallowedTools);
  }
  if (options.maxTurns) {
    claudeArgs.push("--max-turns", options.maxTurns);
  }
  if (options.mcpConfig) {
    claudeArgs.push("--mcp-config", options.mcpConfig);
  }

  return {
    claudeArgs,
    promptPath,
  };
}

export async function runClaude(promptPath: string, options: ClaudeOptions) {
  const config = prepareRunConfig(promptPath, options);

  // Create a named pipe
  try {
    await unlink(PIPE_PATH);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  // Create the named pipe
  await execAsync(`mkfifo "${PIPE_PATH}"`);

  // Log prompt file size
  let promptSize = "unknown";
  try {
    const stats = await stat(config.promptPath);
    promptSize = stats.size.toString();
  } catch (e) {
    // Ignore error
  }

  console.log(`Prompt file size: ${promptSize} bytes`);

  // Output to console
  console.log(`Running Claude with prompt from file: ${config.promptPath}`);

  // Start sending prompt to pipe in background
  const catProcess = spawn("cat", [config.promptPath], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const pipeStream = createWriteStream(PIPE_PATH);
  catProcess.stdout.pipe(pipeStream);

  catProcess.on("error", (error) => {
    console.error("Error reading prompt file:", error);
    pipeStream.destroy();
  });

  const claudeProcess = spawn("claude", config.claudeArgs, {
    stdio: ["pipe", "pipe", "inherit"],
  });

  // Handle Claude process errors
  claudeProcess.on("error", (error) => {
    console.error("Error spawning Claude process:", error);
    pipeStream.destroy();
  });

  // Capture output for parsing execution metrics
  let output = "";
  claudeProcess.stdout.on("data", (data) => {
    const text = data.toString();

    // Try to parse as JSON and pretty print if it's on a single line
    const lines = text.split("\n");
    lines.forEach((line: string, index: number) => {
      if (line.trim() === "") return;

      try {
        // Check if this line is a JSON object
        const parsed = JSON.parse(line);
        const prettyJson = JSON.stringify(parsed, null, 2);
        process.stdout.write(prettyJson);
        if (index < lines.length - 1 || text.endsWith("\n")) {
          process.stdout.write("\n");
        }
      } catch (e) {
        // Not a JSON object, print as is
        process.stdout.write(line);
        if (index < lines.length - 1 || text.endsWith("\n")) {
          process.stdout.write("\n");
        }
      }
    });

    output += text;
  });

  // Handle stdout errors
  claudeProcess.stdout.on("error", (error) => {
    console.error("Error reading Claude stdout:", error);
  });

  // Pipe from named pipe to Claude
  const pipeProcess = spawn("cat", [PIPE_PATH]);
  pipeProcess.stdout.pipe(claudeProcess.stdin);

  // Handle pipe process errors
  pipeProcess.on("error", (error) => {
    console.error("Error reading from named pipe:", error);
    claudeProcess.kill("SIGTERM");
  });

  // Wait for Claude to finish with timeout
  const timeoutMs =
    parseInt(process.env.INPUT_TIMEOUT_MINUTES || "300") * 60 * 1000;
  const exitCode = await new Promise<number>((resolve) => {
    let resolved = false;

    // Set a timeout for the process
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.error(
          `Claude process timed out after ${timeoutMs / 1000} seconds`,
        );
        claudeProcess.kill("SIGTERM");
        // Give it 5 seconds to terminate gracefully, then force kill
        setTimeout(() => {
          try {
            claudeProcess.kill("SIGKILL");
          } catch (e) {
            // Process may already be dead
          }
        }, 5000);
        resolved = true;
        resolve(124); // Standard timeout exit code
      }
    }, timeoutMs);

    claudeProcess.on("close", (code) => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        resolve(code || 0);
      }
    });

    claudeProcess.on("error", (error) => {
      if (!resolved) {
        console.error("Claude process error:", error);
        clearTimeout(timeoutId);
        resolved = true;
        resolve(1);
      }
    });
  });

  // Clean up processes
  try {
    catProcess.kill("SIGTERM");
  } catch (e) {
    // Process may already be dead
  }
  try {
    pipeProcess.kill("SIGTERM");
  } catch (e) {
    // Process may already be dead
  }

  // Clean up pipe file
  try {
    await unlink(PIPE_PATH);
  } catch (e) {
    // Ignore errors during cleanup
  }

  // Set conclusion based on exit code
  if (exitCode === 0) {
    // Try to process the output and save execution metrics
    try {
      await writeFile("output.txt", output);

      // Process output.txt into JSON and save to execution file
      const { stdout: jsonOutput } = await execAsync("jq -s '.' output.txt");
      await writeFile(EXECUTION_FILE, jsonOutput);

      console.log(`Log saved to ${EXECUTION_FILE}`);
    } catch (e) {
      core.warning(`Failed to process output for execution metrics: ${e}`);
    }

    core.setOutput("conclusion", "success");
    core.setOutput("execution_file", EXECUTION_FILE);
  } else {
    core.setOutput("conclusion", "failure");

    // Still try to save execution file if we have output
    if (output) {
      try {
        await writeFile("output.txt", output);
        const { stdout: jsonOutput } = await execAsync("jq -s '.' output.txt");
        await writeFile(EXECUTION_FILE, jsonOutput);
        core.setOutput("execution_file", EXECUTION_FILE);
      } catch (e) {
        // Ignore errors when processing output during failure
      }
    }

    process.exit(exitCode);
  }
}
