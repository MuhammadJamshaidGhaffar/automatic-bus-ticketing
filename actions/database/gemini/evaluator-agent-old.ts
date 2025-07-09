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
Your job is to critically evaluate the performance of a voice-based agent responsible for bus ticket bookings. Your evaluation should be based on the following business goals:

1. ✅ **Successful Completion**: The agent should successfully book a ticket when asked, or accurately provide the requested information.
2. 📉 **Efficiency**: The agent should minimize the number of conversation turns needed to reach a resolution.
3. 📊 **Accuracy of Information**: The agent must:
   - Never guess or assume user inputs.
   - Confirm details like city, terminal, seat, route, trip, and bus by calling appropriate functions before using them.
4. 🤖 **Tool Use Discipline**: The agent must:
   - Rely on function calls for information verification.
   - Never fabricate or assume information without validation.
   - Use tool outputs faithfully in responses.
5. 🔁 **Effective Reasoning Loop**: The voice agent operates in an infinite reasoning loop and is expected to:
   - Think step-by-step.
   - Use tool functions iteratively to refine information.
   - Only exit the loop once all details are verified and it is ready to respond finally.
6. 💬 **Natural and Helpful Tone**: The agent should be clear, polite, and informative in all responses.
7. 🚫 **Error Handling**: The agent should handle tool errors gracefully. If a tool indicates a problem (e.g., no available seats), the agent must explain this and guide the user accordingly.

---

### Function Reference:

The following function declarations are available to the voice agent. Use these **as the only allowed function names** in your evaluation and prompt update. Do not invent new functions.

${JSON.stringify(geminFunctionDeclarations, null, 2)}

---

### Your Output Must Include:

 {
    evaluationSummary : How well did the agent meet each business goal?
    updated_prompt: Rewrite the agent's system prompt so that it:
   - Matches all of the above business goals.
   - Describes the reasoning loop clearly.
   - Explains that tools must be used to verify all user-provided inputs.
   - Uses only valid function names from the function list above.
}

Make sure the output response of voice agent should be in json, properly escaped and should follow the structure which is provided in prompt separately in the end of system prompt of voice agent. So when writing prompt you must make sure to limit the voice agent to json output only with the structure appended below in this generated prompt



Be clear, concise, and structured in your update. If the current system prompt is weak or missing key goals, fully rewrite it.Make sure output of evluator agent should be in json and follow this which is properly escaped : 
{
            "evaluation": "Your analysis of what went well and what could be improved...",
            "updated_prompt": "The improved system prompt text..."
          }

`.trim();

async function evaluator(
  conversationFilePath: string,
  systemPromptObjPath: string,
  outputPromptObjPath: string
) {
  // Load all files
  const [conversationData, currentVoiceAgentSystemPromptJSON] =
    await Promise.all([
      fs.readFile(conversationFilePath, "utf-8"),
      fs.readFile(systemPromptObjPath, "utf-8"),
    ]);

  const currentVoiceAgentSystemPromptObj = JSON.parse(
    currentVoiceAgentSystemPromptJSON
  );

  const currentVoiceAgentSystemPrompt =
    currentVoiceAgentSystemPromptObj.instructionPrompt;

  const conversation = JSON.parse(conversationData);

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

User-Agent Conversation (JSON):
${JSON.stringify(conversation, null, 2)}

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

    console.log("now saving the whole raw response in txt file");
    const myUUID = uuidv4();
    const agent_history_file_path = path.join(
      __dirname,
      "evaluator-agent-history",
      `${myUUID}.txt`
    );
    await fs.writeFile(agent_history_file_path, rawTextResponse, "utf-8");

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
          throw new Error(
            "Failed to parse JSON content inside hard-coded block"
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
    } catch (parseError) {
      console.error("Error parsing Gemini JSON response:", parseError);

      throw new Error(`Error parsing Gemini JSON response: ${parseError}`);
    }
  } catch (err) {
    console.error("❌ Error generating evaluation:", err);
  }
}

// Run evaluator
const conversationFilePath = path.join(
  __dirname,
  "conversations",
  "3caa75ad-8730-4081-b180-316e2fb97b4c.json"
);
const systemPromptObjPath = path.join(__dirname, "instructionPromptObj.json");
const outputPromptObjPath = path.join(
  __dirname,
  "output-instructionPromptObj.json"
);

evaluator(conversationFilePath, systemPromptObjPath, outputPromptObjPath);
