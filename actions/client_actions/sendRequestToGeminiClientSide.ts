import {
  ChatSession,
  FunctionCallingMode,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { functions_obj } from "./geminiToolCalls";

// Define the BookingDetails interface
export interface BookingDetails {
  starting_point: string | null;
  destination: string | null;
  date: string | null;
  seat_number: string | null;
  customer_name: string | null;
  phone_number: string | null;
  departure_time: string | null;
  confirmed: boolean;
}

// Define the response structure
interface AssistantResponse {
  narration: string;
  updatedBookingDetails: BookingDetails;
  bookingComplete: boolean;
  bookingSuccessful?: boolean;
  booking_id?: string;
  confirmation_code?: string;
  error_message?: string;
}

// Default response for error cases
const defaultResponse: AssistantResponse = {
  narration:
    "I'm sorry, I encountered an error processing your request. Please try again.",
  updatedBookingDetails: {
    starting_point: null,
    destination: null,
    date: null,
    seat_number: null,
    customer_name: null,
    phone_number: null,
    departure_time: null,
    confirmed: false,
  },
  bookingComplete: false,
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const chats: {
  [chatId: string]: ChatSession;
} = {};

export const sendRequestToGeminiClient = async (
  audioBase64: string | null,
  bookingDetails: BookingDetails,
  chat: ChatSession,
  isFirstInteraction: boolean = false
): Promise<AssistantResponse> => {
  // Log the current state of booking details
  console.log("Received bookingDetails:", JSON.stringify(bookingDetails));
  console.log("Is first interaction:", isFirstInteraction);

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

    let greetingInsight = "";

    if (isFirstInteraction) {
      greetingInsight = `
  This is your first interaction with the user. Start with a polite greeting.
  Include a brief introduction about yourself as a booking assistant for Pakistani inter-city coach travel.
  Keep the greeting brief but friendly with a British accent style.
  `;
    }

    userMessage = `
      ${greetingInsight}

Current booking information:
- Starting Point: ${bookingDetails.starting_point || "Not provided"}
- Destination: ${bookingDetails.destination || "Not provided"}
- Date: ${bookingDetails.date || "Not provided"}
- Departure Time: ${bookingDetails.departure_time || "Not provided"}
- Seat Number: ${bookingDetails.seat_number || "Not provided"}
- Customer Name: ${bookingDetails.customer_name || "Not provided"}
- Phone Number: ${bookingDetails.phone_number || "Not provided"}
- Confirmed: ${bookingDetails.confirmed ? "Yes" : "No"}

[Function Calling Guidance]
If you need to check available buses, call check_available_buses with the starting_point and destination.
If starting_point and destination are set, but no date or departure_time, call check_available_buses to get options.
If starting_point, destination, and date are set, call check_available_seats to find available seats.
If the user asks about specific seat numbers, call check_seat_availability with those details.
If all required booking information is complete (starting_point, destination, date, departure_time, seat_number, customer_name, phone_number), call make_reservation.
Don't make up information - always use the appropriate function call to get real data.

${
  audioBase64
    ? "Process my audio input to update this booking. If I mention any cities or dates, use them to look up available buses using the check_available_buses function."
    : "Let's continue with this booking."
}`;

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
              // throw new Error("No JSON found in response");
              return defaultResponse;
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
        const functionResult = await functions_obj[functionName](functionArgs);
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
              response: functionResult,
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
      console.log(functionResponses);
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
              return defaultResponse;
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
