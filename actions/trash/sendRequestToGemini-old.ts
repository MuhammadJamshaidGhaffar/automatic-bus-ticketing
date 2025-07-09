"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

interface BookingDetails {
  seat_number?: string;
  customer_name?: string;
  phone_number?: string;
  starting_point?: string;
  destination?: string;
  date?: string;
  bus_id?: string;
  departure_time?: string;
}

const dummyDatabase = {
  buses: [
    {
      bus_id: "PK001",
      starting_point: "Karachi",
      destination: "Lahore",
      departure_time: "2025-03-08T08:00:00",
      total_seats: 40,
      available_seats: ["1A", "2A", "5A", "6A", "10A", "15A", "20A", "25A"],
    },
    {
      bus_id: "PK002",
      starting_point: "Karachi",
      destination: "Lahore",
      departure_time: "2025-03-08T14:00:00",
      total_seats: 40,
      available_seats: ["3A", "4A", "7A", "8A", "12A", "18A", "22A", "28A"],
    },
    {
      bus_id: "PK003",
      starting_point: "Islamabad",
      destination: "Peshawar",
      departure_time: "2025-03-08T10:00:00",
      total_seats: 40,
      available_seats: ["1A", "2A", "9A", "10A", "14A", "16A", "19A", "24A"],
    },
    {
      bus_id: "PK004",
      starting_point: "Lahore",
      destination: "Islamabad",
      departure_time: "2025-03-08T11:00:00",
      total_seats: 40,
      available_seats: ["5A", "6A", "11A", "12A", "17A", "20A", "23A", "26A"],
    },
    {
      bus_id: "PK005",
      starting_point: "Faisalabad",
      destination: "Karachi",
      departure_time: "2025-03-08T13:00:00",
      total_seats: 40,
      available_seats: ["2A", "3A", "8A", "9A", "13A", "15A", "21A", "27A"],
    },
  ],
};

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

  const databaseString = JSON.stringify(dummyDatabase);

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
[SYSTEM INSTRUCTIONS - ABSOLUTE REQUIREMENTS]
You are a British-accented voice booking assistant for inter-city coach travel in Pakistan. 
Strictly follow these rules:

1. RESPONSE FORMAT:
   {
     "narration": "British English, <25 words",
     "updates": {
       "starting_point"?: "Valid departure city",
       "destination"?: "Valid destination for starting_point",
       "date"?: "YYYY-MM-DD",
       "departure_time"?: "ISO 8601 timestamp",
       "seat_number"?: "Available seat",
       "customer_name"?: "Full name",
       "phone_number"?: "Pakistani format"
     },
     "complete": boolean // True only after "yes" confirmation
   }

2. VALIDATION:
   - starting_point: Must be a departure city in database
   - destination: Must be a valid destination for starting_point
   - date: Must match route’s departure dates
   - departure_time: Must match route+date
   - seat_number: Must be available (even=window, odd=aisle)
   - phone_number: 11 digits or 0300-1234567 format

3. FIELD RULES:
   - bus_id: Auto-set from route+date+time, never in narration
   - seat_number: Ask "Window or aisle?" if unspecified
   - departure_time: Convert "8am" to ISO format

4. ERROR HANDLING:
   - Invalid start: "We don’t depart from [city]. Try: [list]"
   - Invalid dest: "No route to [city] from [start]. Try: [list]"
   - Invalid date: "No trips on [date]. Try: [list]"
   - Invalid time: "No [time] slot. Try: [list]"

5. CONFIRMATION:
   - All fields set: "Final check: Karachi→Lahore, 2025-03-08 08:00, 14A, Ali Ahmed (0300-7654321). Confirm?"
   - complete=true only on "yes"

6. QUERIES:
   - "Available departures?": List valid starting_points
   - "Available destinations?": List valid destinations for starting_point
   - "Available dates?": List dates for route
   - "Available times?": List times for route+date

Current Date: ${new Date().toISOString().split("T")[0]}
Database: ${databaseString}
`;

  const corePrompt = `
[CONVERSATION CONTEXT]
${lastResponseContext}

[CURRENT BOOKING STATE]
${buildDynamicPrompt(bookingDetails)}

[PROCESSING INSTRUCTIONS]
1. PRIORITY:
   a) Answer queries FIRST (e.g., "available dates?")
   b) Validate and update data
   c) Collect missing fields

2. VALIDATION & UPDATES:
   - starting_point: Validate as departure city. If valid, update and clear destination, date, time, seat.
   - destination: Validate with starting_point. If valid, update and clear date, time, seat.
   - date: Validate with route. If valid, update and clear time, seat.
   - departure_time: Validate with route+date. Set bus_id.
   - seat_number: Validate with bus_id.

3. QUERIES:
   - "Available departures?": List all starting_points
   - "Available destinations?": List destinations for starting_point (or all if unset)
   - "Available dates?": List dates for route (or all if no route)
   - "Available times?": List times for route+date (or ask date)

4. FLOW:
   - Start with starting_point
   - Then destination
   - Then date, time, seat, name, phone
   - Confirm last

[USER INPUT]
"${initialPrompt || "Begin booking process"}"

[RESPONSE FORMAT]
{
  "narration": "British English <25 words",
  "updates": { /* Validated fields */ },
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

// Helper Functions
const validateDepartureCity = (city?: string) => {
  if (!city) return false;
  return dummyDatabase.buses.some((bus) => bus.starting_point === city);
};

const validateDestinationCity = (start?: string, end?: string) => {
  if (!end) return false;
  if (!start) return dummyDatabase.buses.some((bus) => bus.destination === end);
  return dummyDatabase.buses.some(
    (bus) => bus.starting_point === start && bus.destination === end
  );
};

const getAvailableBuses = (start?: string, end?: string) => {
  if (start && end) {
    return dummyDatabase.buses.filter(
      (bus) => bus.starting_point === start && bus.destination === end
    );
  }
  if (start) {
    return dummyDatabase.buses.filter((bus) => bus.starting_point === start);
  }
  if (end) {
    return dummyDatabase.buses.filter((bus) => bus.destination === end);
  }
  return dummyDatabase.buses;
};

const getAvailableDates = (buses: typeof dummyDatabase.buses) => {
  return Array.from(
    new Set(buses.map((bus) => bus.departure_time.split("T")[0]))
  );
};

const getAvailableTimes = (
  buses: typeof dummyDatabase.buses,
  date?: string
) => {
  if (!date) return [];
  return buses
    .filter((bus) => bus.departure_time.startsWith(date))
    .map((bus) => bus.departure_time.split("T")[1].slice(0, 5));
};

const getAvailableSeats = (busId?: string) => {
  if (!busId) return [];
  const bus = dummyDatabase.buses.find((bus) => bus.bus_id === busId);
  return bus ? bus.available_seats : [];
};

const buildDynamicPrompt = (details: BookingDetails) => {
  const validStart = validateDepartureCity(details.starting_point);
  const validDest = validateDestinationCity(
    details.starting_point,
    details.destination
  );
  const buses = getAvailableBuses(details.starting_point, details.destination);

  return `
    [CURRENT BOOKING STATE]
    ${details}
    Departure: ${details.starting_point || "Not set"} ${
    validStart ? "" : "(Invalid)"
  }
    Destination: ${details.destination || "Not set"} ${
    validDest ? "" : "(Invalid)"
  }
    

    [VALIDATION ISSUES]
    ${
      !validStart && details.starting_point
        ? `Invalid departure: ${details.starting_point}`
        : ""
    }
    ${
      validStart && !validDest && details.destination
        ? `No route to ${details.destination} from ${details.starting_point}`
        : ""
    }

    [AVAILABLE OPTIONS]
    Departures: ${[
      ...new Set(dummyDatabase.buses.map((b) => b.starting_point)),
    ].join(", ")}
    ${
      validStart
        ? `Destinations: ${[
            ...new Set(
              getAvailableBuses(details.starting_point).map(
                (b) => b.destination
              )
            ),
          ].join(", ")}`
        : ""
    }
    ${
      validStart && validDest
        ? `Dates: ${getAvailableDates(buses).join(", ")}`
        : ""
    }
    ${
      details.date && validDest
        ? `Times: ${getAvailableTimes(buses, details.date).join(", ")}`
        : ""
    }
    ${
      details.departure_time
        ? `Seats: ${getAvailableSeats(details.bus_id).join(", ")}`
        : ""
    }
  `;
};
