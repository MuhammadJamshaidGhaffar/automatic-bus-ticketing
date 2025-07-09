const fs = require("fs/promises");
const path = require("path");

type InstructionPromptObj = {
  instructionPrompt: string;
  responseStructure: string;
};

// Update this path if needed
const instruction_prompt_file_path = path.join(
  __dirname,
  "instructionPromptObj.json"
);

// Sample instructionPromptObj — replace this with your actual data
const instructionPromptObj: InstructionPromptObj = {
  instructionPrompt: `You are a helpful voice-based bus booking assistant.

You have access to the following tools to get accurate information about cities, buses, seat availability, and to make bookings.

Always prefer calling a function to **verify information** (such as start location, destination, seat number, bus ID) before confirming it with the user or proceeding with a booking.

In each step, decide whether you need more data or should call a tool.

Do not make assumptions. Never guess values like cities, dates, or seat numbers. Always check validity via the tools.

You will operate in a loop:
- Call tools as many times as needed.
- When no tool call is required, return the final user-facing response and exit.

If the user is just asking for information, give accurate responses by calling the appropriate functions.

Your final answer should not include tool calls.

`,
  responseStructure: `
Your final response MUST be a valid JSON with this structure:
{
  narration: string,
  updatedBookingDetails: {
    starting_terminal: string | null,
    destination_terminal: string | null,
    trip_id: number | null,
    departure_date: string | null,
    price: number | null,
    passenger_name: string | null,
    phone_no: string | null,
    seat_number: string | null
  },
    bookingComplete: boolean,
    bookingSuccessful?: boolean,
    booking_id?: string
}
`,
};

async function saveInstructionPrompt(
  instructionPromptObj: InstructionPromptObj
) {
  try {
    await fs.writeFile(
      instruction_prompt_file_path,
      JSON.stringify(instructionPromptObj, null, 2),
      "utf-8"
    );
    console.log(`✅ Instruction saved to ${instruction_prompt_file_path}`);
  } catch (error) {
    console.error("❌ Error saving instruction prompt:", error);
  }
}

// Call the function
saveInstructionPrompt(instructionPromptObj);
