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
  chatId: string | null;
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
  chatId: null,
};

// Function to call the backend API
export const callGeminiAPI = async (
  audioBase64: string | null,
  bookingDetails: BookingDetails,
  chatId: string | null = null
): Promise<AssistantResponse> => {
  try {
    console.log(
      "sending request to gemini url is ",
      process.env.NEXT_PUBLIC_BACKEND_URL
    );
    // const response = await fetch("http://localhost:5000/api/gemini", {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gemini`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBase64,
          bookingDetails,
          chatId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return defaultResponse;
  }
};
