export interface CustomModePrompt {
  slug: string;
  custom_instructions: string;
}

export interface ModePromptResult {
  success: boolean;
  prompt?: CustomModePrompt;
  error?: string;
}

export class ModeLoaderError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ModeLoaderError";
  }
}
