"use server";

import {
  Content,
  FunctionCallingMode,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import {
  load_instruction_prompt,
  loadChatHistory,
  saveChatHistory,
} from "./database/gemini/functions";
import {
  geminFunctionDeclarations,
  GeminiFunctionNames,
  geminiFunctions,
} from "./gemini-function-declarations";
import { parse } from "path";
import { singleTurnEvaluator } from "./database/gemini/single-turn-evaluator-agent";

// Define the BookingDetails interface
export interface BookingDetails {
  starting_terminal: string | null;
  destination_terminal: string | null;
  trip_id: number | null;
  departure_date: string | null;
  price: number | null;
  passenger_name: string | null;
  phone_no: string | null;
  seat_number: string | null;
}

// Define the response structure
interface AssistantResponse {
  narration: string;
  agentThinking: string;
  updatedBookingDetails: BookingDetails;
  bookingComplete: boolean;
  bookingSuccessful?: boolean;
  booking_id?: string;
  wants_to_call_function: boolean;
  conversationEnded: boolean;
}

// Default response for error cases
// const defaultResponse: AssistantResponse = {
//   narration:
//     "I'm sorry, I encountered an error processing your request. Please try again.",
//   updatedBookingDetails: {
//     starting_point: null,
//     destination: null,
//     date: null,
//     seat_number: null,
//     customer_name: null,
//     phone_number: null,
//     departure_time: null,
//     confirmed: false,
//   },
//   bookingComplete: false,
// };

export const sendRequestToGemini = async (
  audioBase64: string | null,
  bookingDetails: BookingDetails,
  isFirstInteraction: boolean = false,
  chat_id: string
): Promise<AssistantResponse> => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // Log the current state of booking details
  console.log("Received bookingDetails:", JSON.stringify(bookingDetails));
  console.log("Is first interaction:", isFirstInteraction);

  const instructionPromptObj = await load_instruction_prompt();
  if (!instructionPromptObj)
    throw new Error("failed to load base instruction Prompt");

  const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const systemInstruction = `${
    instructionPromptObj.instructionPrompt
  } \n\nThe current date is ${today}\n\n${
    isFirstInteraction
      ? "This is the first interaction with user so greet properly."
      : ""
  }\n\n${instructionPromptObj.responseStructure}`;

  console.log(`System intruction is : ${systemInstruction}`);
  // Initialize the model with tools and specific configuration
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: systemInstruction,
        },
      ],
    },
    tools: [
      {
        //@ts-ignore
        functionDeclarations: geminFunctionDeclarations,
      },
    ],
    // toolConfig: {
    //   functionCallingConfig: {
    //     mode: FunctionCallingMode.ANY,
    //   },
    // },
    // generationConfig: {
    //   temperature: 0.2, // Lower temperature for more consistent function calling
    //   maxOutputTokens: 2048,
    // },
  });

  let chatHistory: Content[] = [];

  if (!isFirstInteraction) chatHistory = await loadChatHistory(chat_id);
  else saveChatHistory(chat_id, null);

  let chatHistoryLengthBeforeThisTurn = chatHistory.length;

  // Start a chat session with the same parameters
  const chat = model.startChat({
    history: chatHistory,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });

  try {
    // Process audio input if provided
    let audioPart;
    if (audioBase64) {
      try {
        const base64Data = audioBase64.split(",")[1];
        audioPart = {
          inlineData: {
            mimeType: "audio/webm",
            data: base64Data,
          },
        };
      } catch (error) {
        console.error("Error processing audioBase64:", error);
        throw new Error(`Error processing audioBase64: ${error}`);
      }
    }

    // Build user message content with explicit function calling guidance
    let userMessage = `${JSON.stringify(bookingDetails)}`;

    // Send initial message
    console.log("Sending message to Gemini...");
    let result = await chat.sendMessage(
      audioPart ? [userMessage, audioPart] : [userMessage]
    );

    let iteration = 1;

    while (true) {
      const response = result.response;
      const rawTextResponse = response.text();
      const functionCalls = response.functionCalls();

      console.log("Gemini response:", rawTextResponse);
      console.log(`Iteration no : ${iteration}`);

      console.log(
        "Function calls:",
        functionCalls?.length || 0 > 0 ? functionCalls : "No function calls"
      );

      // If no function calls, try to parse the JSON response directly
      if (!functionCalls || functionCalls.length === 0) {
        try {
          // Try parsing the raw text as JSON first
          let parsedResponse: AssistantResponse;
          try {
            parsedResponse = JSON.parse(rawTextResponse);
          } catch (directParseError) {
            // If that fails, try to extract JSON from markdown code blocks
            const jsonMatch = rawTextResponse.match(
              /```(?:json)?\s*([\s\S]*?)\s*```/
            );
            if (jsonMatch && jsonMatch[1]) {
              parsedResponse = JSON.parse(jsonMatch[1]);
            } else {
              // Last resort: look for anything that looks like JSON
              const potentialJson = rawTextResponse.match(/(\{[\s\S]*\})/);
              if (potentialJson && potentialJson[1]) {
                parsedResponse = JSON.parse(potentialJson[1]);
              } else {
                throw new Error("No JSON found in response");
                // return {
                //   bookingComplete: false,
                //   narration: rawTextResponse,
                //   updatedBookingDetails: bookingDetails,
                // };
              }
            }
          }

          console.log("Parsed response:", parsedResponse);

          if (
            parsedResponse.wants_to_call_function ||
            parsedResponse.narration.includes("call") ||
            parsedResponse.narration.includes("function") ||
            parsedResponse.agentThinking.includes("call") ||
            parsedResponse.agentThinking.includes("function")
          ) {
            console.log(
              "Gemini wants to call function, waiting for function response..."
            );

            result = await chat.sendMessage(
              "ok call those functions which you want to call"
            );
            continue;
          }

          // if (!parsedResponse.wants_to_call_function) {
          // Create the final response object
          const assistantResponse: AssistantResponse = {
            ...parsedResponse,
            updatedBookingDetails: {
              ...bookingDetails,
              ...(parsedResponse.updatedBookingDetails || {}),
            },
          };
          // const assistantResponse: AssistantResponse = {
          //   narration: parsedResponse.narration,
          //   updatedBookingDetails: {
          //     ...bookingDetails,
          //     ...(parsedResponse.updatedBookingDetails || {}),
          //   },
          //   bookingComplete: parsedResponse.bookingComplete || false,
          // };

          // Add booking info if present
          // if (parsedResponse.booking_id)
          //   assistantResponse.booking_id = parsedResponse.booking_id;

          // if (parsedResponse.bookingSuccessful)
          //   assistantResponse.bookingSuccessful = true;
          const turnMessage = (await chat.getHistory()).slice(
            chatHistoryLengthBeforeThisTurn
          );

          console.log(
            "singleTurnEvaluation Messages length",
            turnMessage.length
          );
          console.log(
            "chat history length before this turn",
            chatHistoryLengthBeforeThisTurn
          );
          console.log(
            "current chat history length",
            (await chat.getHistory()).length
          );

          await singleTurnEvaluator(turnMessage);

          saveChatHistory(chat_id, chat);

          return assistantResponse;
          // }
        } catch (parseError) {
          console.error("Error parsing Gemini JSON response:", parseError);

          throw new Error(`Error parsing Gemini JSON response: ${parseError}`);
        }
      }

      // Handle function calls
      const functionResponses = [];

      for (const call of functionCalls) {
        const functionName = call.name as GeminiFunctionNames;
        const functionArgs = call.args;

        console.log(
          `Function called: ${functionName} with args:`,
          functionArgs
        );

        try {
          // Call the appropriate function
          //@ts-ignore
          const functionResult = await geminiFunctions[functionName](
            functionArgs
          );
          console.log(
            `Function ${functionName} result:`,
            JSON.stringify(functionResult).slice(0, 500)
          );

          // Add to function responses
          functionResponses.push({
            functionResponse: {
              name: functionName,
              response: {
                name: functionName,
                response: [functionResult],
              },
            },
          });
        } catch (error) {
          console.error(`Error executing function ${functionName}:`, error);
          functionResponses.push({
            functionResponse: {
              name: functionName,
              response: { error: `Failed to execute ${functionName}` },
            },
          });
        }
      }

      // Send follow-up message with function responses
      if (functionResponses.length > 0) {
        console.log("Sending function responses back to Gemini");
        result = await chat.sendMessage(functionResponses);
      }
    }
  } catch (error) {
    console.error("Error with Gemini API:", error);
    throw new Error(`Error with Gemini API ${error}`);
  }
};
