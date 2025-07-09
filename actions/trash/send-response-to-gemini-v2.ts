"use server";

import { Content, GoogleGenerativeAI } from "@google/generative-ai";
import {
  load_instruction_prompt,
  loadChatHistory,
} from "./database/gemini/functions";
import { geminFunctionDeclarations } from "./gemini-function-declarations";

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
  updatedBookingDetails: BookingDetails;
  bookingComplete: boolean;
  bookingSuccessful?: boolean;
  booking_id?: string;
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
): Promise<AssistantResponse | null> => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // Log the current state of booking details
  console.log("Received bookingDetails:", JSON.stringify(bookingDetails));
  console.log("Is first interaction:", isFirstInteraction);

  const instructionPromptObj = await load_instruction_prompt();

  const systemInstruction = instructionPromptObj?.instructionPrompt;

  if (!systemInstruction) return null;

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
    tools: {
      //@ts-ignore
      geminFunctionDeclarations,
    },
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent function calling
      maxOutputTokens: 2048,
    },
  });

  let chatHistory: Content[] = [];

  if (isFirstInteraction) chatHistory = await loadChatHistory(chat_id);

  // Start a chat session with the same parameters
  const chat = model.startChat({
    history: chatHistory,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });

  // Build system instruction with greeting context
  let greetingInsight = "";

  if (isFirstInteraction) {
    greetingInsight = `
This is your first interaction with the user. Start with a polite greeting.
Include a brief introduction about yourself as a booking assistant for Pakistani inter-city coach travel.
Keep the greeting brief but friendly with a British accent style.
`;
  }

  const systemInstruction = `
You are a British-accented voice booking assistant for inter-city coach travel in Pakistan.
${greetingInsight}

IMPORTANT FUNCTION CALLING INSTRUCTIONS:
- ALWAYS use function calls to retrieve data. DO NOT make up information.
- If the user asks about available buses or routes, IMMEDIATELY call check_available_buses.
- If the user mentions a city name like Islamabad, Karachi, Lahore, etc., extract it and use it in your function calls.
- If the user asks about seat availability, call check_available_seats.
- When checking seat availability for specific seats, call check_seat_availability.
- When all booking information is confirmed, call make_reservation.

Follow these rules:
1. Be polite, professional, and helpful at all times.
2. Collect all required information for a bus booking in a conversational manner.
3. The required fields are: starting_point, destination, date, departure_time, seat_number, customer_name, and phone_number.
4. Confirm details with the user before making a reservation.
5. Always provide fare and journey duration information when available.
6. If missing information, politely ask for it.
7. Present confirmation code and booking ID clearly when booking is successful.
8. Update bookingDetails with any new information from the user.
9. For dates, use YYYY-MM-DD format (e.g., 2025-03-20).
10. For times, use 24-hour format (e.g., 14:30).
11. Available Pakistani cities: Karachi, Lahore, Islamabad, Peshawar, Multan, Faisalabad, Quetta, Rawalpindi.

Your response MUST be a valid JSON with this structure:
{
  "narration": "Text to be spoken to the user",
  "updatedBookingDetails": {
    "starting_point": "city or null",
    "destination": "city or null",
    "date": "YYYY-MM-DD or null",
    "seat_number": "seat ID or null",
    "customer_name": "name or null",
    "phone_number": "number or null",
    "departure_time": "HH:MM or null",
    "confirmed": boolean
  },
  "bookingComplete": boolean,
  "booking_id": "ID if booking completed",
  "confirmation_code": "code if booking completed"
}`;

  // Initialize the model with tools and specific configuration
  // const model = genAI.getGenerativeModel({
  //   model: "gemini-2.0-flash",
  //   systemInstruction: {
  //     role: "system",
  //     parts: [
  //       {
  //         text: systemInstruction,
  //       },
  //     ],
  //   },
  //   tools: {
  //     functionDeclarations,
  //   },
  //   generationConfig: {
  //     temperature: 0.2, // Lower temperature for more consistent function calling
  //     maxOutputTokens: 2048,
  //     responseMimeType: "application/json",
  //   },
  // });

  // // Start a chat session with the same parameters
  // const chat = model.startChat({
  //   generationConfig: {
  //     temperature: 0.2,
  //     maxOutputTokens: 2048,
  //   },
  // });

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
        return defaultResponse;
      }
    }

    // Build user message content with explicit function calling guidance
    let userMessage = "";

    if (isFirstInteraction) {
      userMessage = `Starting a new booking session. Please greet me and help me book an inter-city coach ticket in Pakistan.`;
    } else {
      userMessage = `
Current booking information:
- Starting Point: ${bookingDetails.starting_point || "Not provided"}
- Destination: ${bookingDetails.destination || "Not provided"}
- Date: ${bookingDetails.date || "Not provided"}
- Departure Time: ${bookingDetails.departure_time || "Not provided"}
- Seat Number: ${bookingDetails.seat_number || "Not provided"}
- Customer Name: ${bookingDetails.customer_name || "Not provided"}
- Phone Number: ${bookingDetails.phone_number || "Not provided"}
- Confirmed: ${bookingDetails.confirmed ? "Yes" : "No"}

${
  audioBase64
    ? "Process my audio input to update this booking. If I mention any cities or dates, use them to look up available buses using the check_available_buses function."
    : "Let's continue with this booking. Use function calls to retrieve actual data from the database."
}`;
    }

    // Send initial message
    console.log("Sending message to Gemini...");
    const result = await chat.sendMessage(
      audioPart ? [userMessage, audioPart] : [userMessage]
    );

    const response = result.response;
    const rawTextResponse = response.text();
    const functionCalls = response.functionCalls();

    console.log("Initial Gemini response:", rawTextResponse);
    console.log(
      "Function calls:",
      functionCalls?.length > 0 ? functionCalls : "No function calls"
    );

    // If no function calls, try to parse the JSON response directly
    if (!functionCalls || functionCalls.length === 0) {
      try {
        // Try parsing the raw text as JSON first
        let parsedResponse;
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
            }
          }
        }

        // Create the final response object
        const assistantResponse: AssistantResponse = {
          narration: parsedResponse.narration,
          updatedBookingDetails: {
            ...bookingDetails,
            ...(parsedResponse.updatedBookingDetails || {}),
          },
          bookingComplete: parsedResponse.bookingComplete || false,
        };

        // Add booking info if present
        if (parsedResponse.booking_id) {
          assistantResponse.booking_id = parsedResponse.booking_id;
          assistantResponse.bookingSuccessful = true;
          assistantResponse.confirmation_code =
            parsedResponse.confirmation_code;
        }

        return assistantResponse;
      } catch (parseError) {
        console.error("Error parsing Gemini JSON response:", parseError);

        // Fallback to a simple text response if all parsing attempts fail
        return {
          narration: rawTextResponse.slice(0, 500), // Limit response length
          updatedBookingDetails: bookingDetails,
          bookingComplete: false,
        };
      }
    }

    // Handle function calls
    const functionResponses = [];

    for (const call of functionCalls) {
      const functionName = call.name;
      const functionArgs = call.args;

      console.log(`Function called: ${functionName} with args:`, functionArgs);

      try {
        // Call the appropriate function
        const functionResult = await functions[functionName](functionArgs);
        console.log(
          `Function ${functionName} result:`,
          JSON.stringify(functionResult).slice(0, 500)
        );

        // Add to function responses
        functionResponses.push({
          functionResponse: {
            name: functionName,
            response: functionResult,
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
      const secondResponse = await chat.sendMessage(functionResponses);
      const finalRawText = secondResponse.response.text();
      console.log("Final Gemini response after function calls:", finalRawText);

      try {
        // Try parsing the raw text as JSON first
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(finalRawText);
        } catch (directParseError) {
          // If that fails, try to extract JSON from markdown code blocks
          const jsonMatch = finalRawText.match(
            /```(?:json)?\s*([\s\S]*?)\s*```/
          );
          if (jsonMatch && jsonMatch[1]) {
            parsedResponse = JSON.parse(jsonMatch[1]);
          } else {
            // Last resort: look for anything that looks like JSON
            const potentialJson = finalRawText.match(/(\{[\s\S]*\})/);
            if (potentialJson && potentialJson[1]) {
              parsedResponse = JSON.parse(potentialJson[1]);
            } else {
              throw new Error("No JSON found in response");
            }
          }
        }

        // Create the final response object
        const assistantResponse: AssistantResponse = {
          narration: parsedResponse.narration,
          updatedBookingDetails: {
            ...bookingDetails,
            ...(parsedResponse.updatedBookingDetails || {}),
          },
          bookingComplete: parsedResponse.bookingComplete || false,
        };

        // Add booking info if present
        if (parsedResponse.booking_id) {
          assistantResponse.booking_id = parsedResponse.booking_id;
          assistantResponse.bookingSuccessful = true;
          assistantResponse.confirmation_code =
            parsedResponse.confirmation_code;
        }

        return assistantResponse;
      } catch (parseError) {
        console.error("Error parsing final Gemini JSON response:", parseError);

        // Fallback to a simple text response if all parsing attempts fail
        return {
          narration: finalRawText.slice(0, 500), // Limit response length
          updatedBookingDetails: bookingDetails,
          bookingComplete: false,
        };
      }
    }

    // We should never reach here if the code is working properly
    return {
      narration:
        "I'm having trouble processing your request. Please try again.",
      updatedBookingDetails: bookingDetails,
      bookingComplete: false,
    };
  } catch (error) {
    console.error("Error with Gemini API:", error);
    return defaultResponse;
  }
};
