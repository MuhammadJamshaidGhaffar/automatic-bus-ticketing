"use server";

import { Content } from "@google/generative-ai";

const fs = require("fs/promises");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

type InstructionPromptObj = {
  instructionPrompt: string;
  responseStructure: string;
};

const geminFunctionDeclarations = [
  {
    name: "getAllTrips",
    description: `Get a list of all trips including route, bus, driver, time, and fare.\n\nResponse:\n[\n  {\n    id: number,\n    route_id: number,\n    bus_id: number,\n    driver_id: number,\n    departure_time: string,\n    price: number\n  }\n]`,
  },
  {
    name: "getTripById",
    description: `Get a specific trip by its ID. This includes route ID, bus ID, driver ID, departure time, and fare.\n\nResponse:\n{\n  id: number,\n  route_id: number,\n  bus_id: number,\n  driver_id: number,\n  departure_time: string,\n  price: number\n}`,
  },
  {
    name: "getAllBookings",
    description: `Get a list of all bookings with passenger, seat, and trip details.\n\nResponse:\n[\n  {\n    id: number,\n    passenger_name: string,\n    phone_no: string,\n    trip_id: number,\n    seat_number: number,\n    booking_time: string,\n    status: string\n  }\n]`,
  },
  {
    name: "getBookingById",
    description: `Get a specific booking by its ID.\n\nResponse:\n{\n  id: number,\n  passenger_name: string,\n  phone_no: string,\n  trip_id: number,\n  seat_number: number,\n  booking_time: string,\n  status: string\n}`,
  },
  {
    name: "createBooking",
    description: `Creates a new booking for a trip with the provided passenger details and seat number.\n\nResponse:\n{\n  booking_id: number,  // The unique ID of the newly created booking\n  status: string,      // The status of the booking (e.g., 'confirmed')\n  message: string      // Confirmation message indicating the booking creation result\n}`,
  },
  {
    name: "getAllPayments",
    description: `Get all recorded payments with booking and amount details.\n\nResponse:\n[\n  {\n    id: number,\n    booking_id: number,\n    amount: number,\n    payment_method: string,\n    payment_time: string\n  }\n]`,
  },
  {
    name: "getPaymentById",
    description: `Get a specific payment by its ID.\n\nResponse:\n{\n  id: number,\n  booking_id: number,\n  amount: number,\n  payment_method: string,\n  payment_time: string\n}`,
  },
  {
    name: "getAllBuses",
    description: `Get a list of all buses including registration number and capacity.\n\nResponse:\n[\n  {\n    id: number,\n    registration_number: string,\n    capacity: number\n  }\n]`,
  },
  {
    name: "getBusById",
    description: `Get a specific bus by its ID.\n\nResponse:\n{\n  id: number,\n  registration_number: string,\n  capacity: number\n}`,
  },
  {
    name: "getAllRoutes",
    description: `Get a list of all routes with distance and estimated time.\n\nResponse:\n[\n  {\n    id: number,\n    from_terminal_id: number,\n    to_terminal_id: number,\n    distance_km: number,\n    estimated_time: string\n  }\n]`,
  },
  {
    name: "getRouteById",
    description: `Get a specific route by its ID.\n\nResponse:\n{\n  id: number,\n  from_terminal_id: number,\n  to_terminal_id: number,\n  distance_km: number,\n  estimated_time: string\n}`,
  },
  {
    name: "getAllTerminals",
    description: `Get a list of all terminals with name and city.\n\nResponse:\n[\n  {\n    id: number,\n    name: string,\n    city: string\n  }\n]`,
  },
  {
    name: "getTerminalById",
    description: `Get a specific terminal by its ID.\n\nResponse:\n{\n  id: number,\n  name: string,\n  city: string\n}`,
  },
  {
    name: "checkAvailableSeats",
    description: `Returns a list of available seat numbers for a specific trip. The seat numbers are plain strings like "1", "2", ..., up to the bus capacity.\n\nResponse:\n{\n  availableSeats: string[]\n}`,
  },
];

// Set your API key
const GEMINI_API_KEY = "AIzaSyAll33cob1DqxUXiiIREFHW-SSkhBO6kAM";

const evaluatorPrompt = `
You are an evaluator agent tasked with analyzing **a single turn** (one user message and one assistant response) from an ongoing conversation between a user and a voice-based assistant that books bus tickets.

⚠️ You are **not receiving the entire conversation history** — only the current exchange. Evaluate the assistant's performance **only based on this turn**.

Assess the assistant’s performance based on the following **business goals**:

1. ✅ **Successful Completion**: Did the assistant correctly progress the task or complete the booking if applicable?
2. 📉 **Efficiency**: Was this turn necessary and helpful in minimizing total conversation length?
3. 📊 **Accuracy of Information**:
   - The assistant must not make assumptions.
   - Details like city, terminal, seat, route, trip, and bus must be verified via tools/functions.
4. 🤖 **Tool Use Discipline**:
   - Only use approved functions.
   - No fabrication or guessing unverified data.
   - Use tool outputs exactly as returned.
5. 🔁 **Effective Reasoning Loop**:
   - The assistant must operate in a step-by-step loop using tools until everything is confirmed.
6. 💬 **Tone & Helpfulness**:
   - The assistant must be polite, clear, and helpful.
7. 🚫 **Error Handling**:
   - The assistant must explain and guide appropriately if any function/tool indicates a failure.

---

### 🛠️ Function Reference:

Below are the **only valid function names** the agent may use. Use these when evaluating correctness and tool use:

${JSON.stringify(geminFunctionDeclarations, null, 2)}

---

### 📤 Output Format:

Return your evaluation in **strictly escaped JSON** using this format:

\`\`\`json
{
  "evaluation": "Your analysis of what went well and what could be improved...",
  "updated_prompt": "The improved system prompt text..."
}
\`\`\`

📌 When writing \`updated_prompt\`:
- Rewrite the agent's system prompt to incorporate all the business goals above
- Emphasize the use of reasoning loops and proper tool verification
- **Do not modify or include the structure of the agent's output JSON**
- Simply state in the prompt that the **agent must return responses in JSON format**, as defined elsewhere

Be clear, concise, and structured in your update.
`.trim();

const systemPromptObjPath =
  "./actions/database/gemini/instructionPromptObj.json";
const outputPromptObjPath = systemPromptObjPath;

export async function singleTurnEvaluator(turnMessages: Content[]) {
  // Load all files
  const [currentVoiceAgentSystemPromptJSON] = await Promise.all([
    fs.readFile(systemPromptObjPath, "utf-8"),
  ]);

  const currentVoiceAgentSystemPromptObj = JSON.parse(
    currentVoiceAgentSystemPromptJSON
  );

  const currentVoiceAgentSystemPrompt =
    currentVoiceAgentSystemPromptObj.instructionPrompt;

  // Prepare model
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: `You are an evaluator agent for a voice-based bus booking assistant.
          
          Respond strictly in this JSON format and properly escaped:
          {
            "evaluation": "Your analysis of what went well and what could be improved...",
            "updated_prompt": "The improved system prompt text..."
          }
          `,
        },
      ],
    },
  });

  // Construct evaluator message
  const prompt = `
You are an evaluator agent for a voice-based bus booking assistant.

System Prompt for Agent Being Evaluated:
"""${currentVoiceAgentSystemPrompt}"""

Evaluator Instruction:
"""${evaluatorPrompt}"""

User-Agent latest turn Conversation (JSON):
${JSON.stringify(turnMessages, null, 2)}

Your Task:
- Evaluate how well the agent performs based on the above goals.
- Give an updated version of the system prompt that would help the agent better align with the business goals.
`;

  try {
    console.log("Sending all data to evaluator for evaluation");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawTextResponse = response.text();
    console.log("✅ Evaluation Result:\n", rawTextResponse);

    console.log("now extracting json");

    try {
      // Try parsing the raw text as JSON first
      let parsedResponse: {
        evaluation: string;
        updated_prompt: string;
      };
      try {
        parsedResponse = JSON.parse(rawTextResponse);
      } catch (directParseError) {
        // Since you know the JSON always starts at char 15 and ends 3 chars before the end:
        const START_OFFSET = 8; // adjust to your actual start index
        const END_OFFSET_FROM_END = 4; // adjust to your actual trailing fence length

        const jsonString = rawTextResponse
          .slice(START_OFFSET, rawTextResponse.length - END_OFFSET_FROM_END)
          .trim();

        console.log("Extracted JSON:", jsonString);

        try {
          parsedResponse = JSON.parse(jsonString);
        } catch (nestedError) {
          console.log(
            "Failed to parse JSON content inside hard-coded block",
            nestedError
          );
        }
      }

      // save this to a outputPromptObjPath
      const outputPromptObj: InstructionPromptObj = {
        instructionPrompt: parsedResponse.updated_prompt,
        responseStructure: currentVoiceAgentSystemPromptObj.responseStructure,
      };

      console.log("saving to file");

      console.log(outputPromptObj);

      await fs.writeFile(
        outputPromptObjPath,
        JSON.stringify(outputPromptObj, null, 2),
        "utf-8"
      );

      console.log("saved to file");

      return true;
    } catch (parseError) {
      console.error("Error parsing Gemini JSON response:", parseError);

      return false;
    }
  } catch (err) {
    console.error("❌ Error generating evaluation:", err);

    return false;
  }
}
