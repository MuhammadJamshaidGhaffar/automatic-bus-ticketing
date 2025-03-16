import { sendRequestToGeminiClient } from "@/actions/client_actions/sendRequestToGeminiClientSide";
import { ChatSession } from "@google/generative-ai";

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

// Function to call the backend API
export const callGeminiAPI = async (
  audioBase64: string | null,
  bookingDetails: BookingDetails,
  chat: ChatSession,
  isFirstInteraction: boolean = false
): Promise<AssistantResponse> => {
  try {
    return await sendRequestToGeminiClient(
      audioBase64,
      bookingDetails,
      chat,
      isFirstInteraction
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return defaultResponse;
  }
};

export const updateObjectSkippingNulls = (
  original: Object,
  updates: Object
) => {
  return {
    ...original,
    ...Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== null)
    ),
  };
};

export const filterNonNullFields = (obj: Object) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null)
  );
};
