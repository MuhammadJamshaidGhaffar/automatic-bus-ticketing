"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

interface BookingDetails {
  seat_number?: string;
  customer_name?: string;
  phone_number?: string;
  starting_point?: string;
  destination?: string;
  date?: string;
  departure_time?: string;
}

const defaultResponse = {
  narration: "How may I assist with your travel plans today?",
  updates: {},
  complete: false,
};

export const sendRequestToGemini = async (
  audioBase64: string | null,
  bookingDetails: BookingDetails = {},
  initialPrompt?: string,
  lastGeminiResponse?: {
    narration: string;
    updates: BookingDetails;
    complete: boolean;
  } | null
) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  console.log("Received bookingDetails:", JSON.stringify(bookingDetails));
  console.log(
    "Received lastGeminiResponse:",
    JSON.stringify(lastGeminiResponse)
  );

  const lastResponseContext = lastGeminiResponse
    ? `
      [Previous Message Context]
      ${JSON.stringify(lastGeminiResponse)}
      [End of Previous Message Context]
    `
    : `
      [Previous Message Context]
      No previous message available.
      [End of Previous Message Context]
    `;

  const systemPrompt = `
[SYSTEM INSTRUCTIONS]
You are a British-accented voice booking assistant for inter-city coach travel. 
Follow these rules:

1. RESPONSE FORMAT:
   {
     "narration": "British English, <25 words",
     "updates": {
       "starting_point"?: string,
       "destination"?: string,
       "date"?: string,
       "departure_time"?: string,
       "seat_number"?: string,
       "customer_name"?: string,
       "phone_number"?: string
     },
     "complete": boolean // True only when all fields are filled
   }

2. FLOW:
   - Ask for fields in this order: starting_point, destination, date, departure_time, seat_number, customer_name, phone_number.
   - Update fields as provided without validation.
   - When all fields are filled, ask for confirmation: "Final check: [start] to [dest], [date] at [time], seat [seat], [name] ([phone]). Confirm?"
   - Set complete=true only on "yes" or "confirm".

3. QUESTIONS:
   - "Where are you travelling from?"
   - "Where are you going?"
   - "When would you like to travel?"
   - "What time would you prefer?"
   - "Which seat would you like?"
   - "May I have your name?"
   - "What’s your phone number?"

Current Date: ${new Date().toISOString().split("T")[0]}
`;

  const corePrompt = `
[CONVERSATION CONTEXT]
${lastResponseContext}

[CURRENT BOOKING STATE]
Starting Point: ${bookingDetails.starting_point || "Not set"}
Destination: ${bookingDetails.destination || "Not set"}
Date: ${bookingDetails.date || "Not set"}
Departure Time: ${bookingDetails.departure_time || "Not set"}
Seat Number: ${bookingDetails.seat_number || "Not set"}
Customer Name: ${bookingDetails.customer_name || "Not set"}
Phone Number: ${bookingDetails.phone_number || "Not set"}

[PROCESSING INSTRUCTIONS]
1. If user provides a field, update it in "updates".
2. Ask the next missing field question.
3. If all fields are filled, ask for confirmation.
4. Set "complete": true only if user says "yes" or "confirm" after all fields are set.

[USER INPUT]
"${initialPrompt || "Begin booking process"}"

[RESPONSE FORMAT]
{
  "narration": "British English <25 words",
  "updates": { /* Fields provided */ },
  "complete": false/true
}
`;

  const fullPrompt = audioBase64
    ? `${systemPrompt}\n${corePrompt}`
    : `${systemPrompt}\n${corePrompt}`;

  try {
    console.log("Gemini is thinking...");
    const response = await model.generateContent(
      audioBase64 ? [{ text: fullPrompt }, audioPart!] : [{ text: fullPrompt }]
    );
    const contentResponse = await response.response;

    if (
      !contentResponse.candidates ||
      contentResponse.candidates.length === 0
    ) {
      console.error("No candidates found in Gemini response");
      return defaultResponse;
    }

    const rawText = contentResponse.candidates[0].content.parts[0].text;
    console.log(`Gemini response raw text: ${rawText}`);

    const jsonText = rawText.match(/```json\s*([\s\S]*?)\s*```/)?.[1];
    if (!jsonText) {
      console.error("No valid JSON found in Gemini response");
      return defaultResponse;
    }

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (e) {
      console.error("Invalid JSON format in Gemini response:", e);
      return defaultResponse;
    }

    if (
      !result ||
      typeof result.narration !== "string" ||
      typeof result.updates !== "object" ||
      typeof result.complete !== "boolean"
    ) {
      console.error("Invalid response structure:", result);
      return defaultResponse;
    }

    return result;
  } catch (error) {
    console.error("Error in Gemini request:", error);
    return defaultResponse;
  }
};
