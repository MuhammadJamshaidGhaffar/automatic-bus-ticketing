"use server";

import { ChatSession, Content } from "@google/generative-ai";
import { writeFile, readFile } from "fs/promises";

export async function saveChatHistory(
  id: string,
  chat: ChatSession | null
): Promise<void> {
  try {
    let history: Content[] = [];
    if (chat) history = await chat.getHistory();
    const filePath = `./actions/database/gemini/conversations/${id}.json`;
    await writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");
    console.log(`Chat history saved to ${filePath}`);
  } catch (err) {
    console.error("Failed to save chat:", err);
  }
}

export async function loadChatHistory(id: string) {
  try {
    const filePath = `./actions/database/gemini/conversations/${id}.json`;
    const content = await readFile(filePath, "utf-8");
    const history = JSON.parse(content) as Content[];

    console.log(`Chat history loaded from ${filePath}`);
    return history;
  } catch (err) {
    console.error("Failed to load chat:", err);
    throw err;
  }
}

type InstructionPromptObj = {
  instructionPrompt: string;
  responseStructure: string;
};

const instruction_prompt_file_path =
  "./actions/database/gemini/instructionPromptObj.json";

export async function save_instruction_prompt(
  instructionPromptObj: InstructionPromptObj
): Promise<void> {
  await writeFile(
    instruction_prompt_file_path,
    JSON.stringify(instructionPromptObj, null, 2),
    "utf-8"
  );

  console.log(`Instruction saved to ${instruction_prompt_file_path}`);
}

export async function load_instruction_prompt(): Promise<InstructionPromptObj | null> {
  try {
    const instructionPromptObj = JSON.parse(
      await readFile(instruction_prompt_file_path, "utf-8")
    );

    return instructionPromptObj;
  } catch (error) {
    console.error(
      `Error loading instruction from ${instruction_prompt_file_path}:`,
      error
    );
    return null;
  }
}
