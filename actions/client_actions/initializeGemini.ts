"use client";
import { useEffect, useRef } from "react";
import {
  ChatSession,
  GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { functionDeclarations } from "./geminiToolCalls";

export const getGeminiChatSession = () => {
  const chat = useRef<ChatSession>({});

  useEffect(() => {
    console.log("initialzing chat session!");

    const genAI = new GoogleGenerativeAI(
      "AIzaSyAll33cob1DqxUXiiIREFHW-SSkhBO6kAM"
    );
    try {
      const systemInstruction = `
        You are a British-accented voice booking assistant for inter-city coach travel in Pakistan.
        
        
        IMPORTANT FUNCTION CALLING INSTRUCTIONS:
        - ALWAYS use function calls to retrieve data. DO NOT make up information.
        - If the user asks about available buses or routes, IMMEDIATELY call check_available_buses.
        - If the user mentions a city name like Islamabad, Karachi, Lahore, etc., extract it and use it in your function calls.
        - If the user asks about seat availability, call check_available_seats.
        - When checking seat availability for specific seats, call check_seat_availability.
        - When all booking information is confirmed, call make_reservation.
        
        
        If you want to call a function, then call it.
        
        
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
        }
        `;

      /*
        
        
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
        
        
        */

      const genAI = new GoogleGenerativeAI(
        "AIzaSyAll33cob1DqxUXiiIREFHW-SSkhBO6kAM"
      );
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
          functionDeclarations,
        },
        // toolConfig: {
        //   functionCallingConfig: {
        //     // Possible values are: Mode.AUTO, Mode.ANY, Mode.NONE
        //     mode: FunctionCallingMode.AUTO,
        //   },
        // },
        generationConfig: {
          // temperature: 0.2, // Lower temperature for more consistent function calling
          maxOutputTokens: 2048,
        },
      });

      // Start a chat session with the same parameters
      chat.current = model.startChat({
        generationConfig: {
          // temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });
    } catch (error) {
      console.error("Failed to initialize Gemini API:", error);
      chat.current = null;
    }
  }, []);

  return chat;
};
