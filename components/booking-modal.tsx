"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic } from "lucide-react";
import { sendRequestToGemini } from "@/actions/sendRequestToGemini";

interface BookingModalProps {
  onClose: () => void;
}

type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "intro";

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

export default function BookingModal({ onClose }: BookingModalProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("intro");
  const [message, setMessage] = useState<string>("Starting...");
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({});
  const [lastGeminiResponse, setLastGeminiResponse] = useState<{
    narration: string;
    updates: BookingDetails;
    complete: boolean;
  } | null>(null); // Store last Gemini response
  const [trigger, setTrigger] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpeakingActive, setIsSpeakingActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isClosingRef = useRef(false);
  const hasGreetedRef = useRef(false);

  const handleBookingComplete = (details: BookingDetails) => {
    console.log("Booking Complete! Final Details:", JSON.stringify(details));
    setIsCompleted(true);
    setMessage("Booking Completed Successfully!");
  };

  const handleClose = () => {
    isClosingRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log("Stopping media recorder for cleanup...");
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      console.log("Closing AudioContext...");
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      console.log("Canceling speech synthesis...");
      speechSynthesis.cancel();
    }
    if (silenceTimeoutRef.current) {
      console.log("Clearing silence timeout...");
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onClose();
  };

  const fetchIntroMessage = async () => {
    console.log("Fetching introductory message from Gemini...");
    setRecordingState("processing");
    setMessage("Preparing greeting...");

    try {
      const response = await sendRequestToGemini(
        null,
        bookingDetails,
        "Provide a friendly introductory greeting for a voice-based booking assistant and ask for the starting point to start the booking process.",
        lastGeminiResponse // Pass last response
      );
      console.log("Intro response from Gemini:", response);
      setLastGeminiResponse(response); // Store response

      if (response.narration) {
        setRecordingState("speaking");
        setMessage("Agent Speaking ...");
        const utterance = new SpeechSynthesisUtterance(response.narration);
        utterance.lang = "en-GB";
        utterance.onstart = () => {
          console.log("Intro speech started...");
          setIsSpeakingActive(true);
        };
        utterance.onend = () => {
          console.log("Intro speech finished, starting recording...");
          setIsSpeakingActive(false);
          setRecordingState("idle");
          setTrigger((prev) => !prev); // Start recording after intro
        };
        speechSynthesis.speak(utterance);
      } else {
        setRecordingState("idle");
        setMessage("Listening...");
        setTrigger((prev) => !prev);
      }
    } catch (error) {
      console.error("Error fetching intro message:", error);
      setRecordingState("idle");
      setMessage("Error starting assistant. Please try again.");
      setTrigger((prev) => !prev);
    }
  };

  const startRecording = async () => {
    console.log(
      "Starting recording with bookingDetails:",
      JSON.stringify(bookingDetails)
    );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log("Audio data available:", event.data.size);
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Recording stopped, processing audio...");
        if (isClosingRef.current) {
          console.log("Modal is closing, skipping Gemini call...");
          stream.getTracks().forEach((track) => track.stop());
          if (
            audioContextRef.current &&
            audioContextRef.current.state !== "closed"
          ) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        if (audioBlob.size === 0) {
          console.log("No audio recorded, triggering restart...");
          setRecordingState("idle");
          setMessage("Listening...");
          setTrigger((prev) => !prev);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          setRecordingState("processing");
          setMessage("Processing your request...");

          try {
            const base64Audio = reader.result as string;
            const response = await sendRequestToGemini(
              base64Audio,
              bookingDetails,
              undefined, // No initial prompt here
              lastGeminiResponse // Pass last response
            );
            console.log("Response from Gemini:", response);
            setLastGeminiResponse(response); // Store response

            if (response.updates) {
              setBookingDetails((prev) => {
                const updatedDetails = { ...prev, ...response.updates };
                console.log(
                  "Updated bookingDetails:",
                  JSON.stringify(updatedDetails)
                );
                return updatedDetails;
              });
            }

            if (response.complete) {
              handleBookingComplete({ ...bookingDetails, ...response.updates });
            }

            if (response.narration) {
              setRecordingState("speaking");
              setMessage("Agent Speaking ...");
              const utterance = new SpeechSynthesisUtterance(
                response.narration
              );
              utterance.lang = "en-GB";
              utterance.onstart = () => {
                console.log("Speech started...");
                setIsSpeakingActive(true);
              };
              utterance.onend = () => {
                console.log("Gemini finished speaking, triggering restart...");
                setIsSpeakingActive(false);
                const updatedDetails = {
                  ...bookingDetails,
                  ...response.updates,
                };
                if (response.complete) {
                  handleBookingComplete(updatedDetails);
                } else {
                  setRecordingState("idle");
                  setMessage("Listening...");
                  setTrigger((prev) => !prev);
                }
              };
              speechSynthesis.speak(utterance);
            }
          } catch (error) {
            console.error("Error processing audio:", error);
            setRecordingState("idle");
            setMessage("Error processing your request. Restarting...");
            setTrigger((prev) => !prev);
          }
        };

        stream.getTracks().forEach((track) => track.stop());
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed"
        ) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setRecordingState("recording");
      setMessage("Recording... Speak now");

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateVolume = () => {
        if (
          !analyserRef.current ||
          !mediaRecorderRef.current ||
          mediaRecorderRef.current.state !== "recording"
        ) {
          setVolumeLevel(0);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
        setVolumeLevel(Math.min(average / 255, 1));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      animationFrameRef.current = requestAnimationFrame(updateVolume);

      const checkSilence = () => {
        if (
          !analyserRef.current ||
          !mediaRecorderRef.current ||
          mediaRecorderRef.current.state !== "recording"
        ) {
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
        const silenceThreshold = 10;

        if (average < silenceThreshold) {
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== "inactive"
              ) {
                console.log("Silence detected, stopping recording...");
                mediaRecorderRef.current.stop();
                silenceTimeoutRef.current = null;
              }
            }, 1000);
          }
        } else {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
        requestAnimationFrame(checkSilence);
      };
      requestAnimationFrame(checkSilence);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMessage("Error accessing microphone. Please check permissions.");
      setRecordingState("idle");
      setTrigger((prev) => !prev);
    }
  };

  useEffect(() => {
    isClosingRef.current = false;
    if (!hasGreetedRef.current) {
      fetchIntroMessage(); // Run intro on first mount
      hasGreetedRef.current = true;
    } else if (recordingState === "idle" && !isCompleted) {
      startRecording(); // Normal recording cycle after intro
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [trigger, isCompleted]);

  const stopRecordingManually = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      console.log("Manual stop triggered...");
      mediaRecorderRef.current.stop();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-[#1F2937] bg-opacity-50"
        onClick={handleClose}
      ></div>

      <div className="bg-[#E5E7EB] rounded-lg p-6 w-full max-w-[400px] z-10 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1F2937]">
            {isCompleted ? "Booking Confirmation" : "Booking Assistant"}
          </h2>
          <button
            onClick={handleClose}
            className="text-[#1F2937] hover:text-[#1E90FF] transition-colors"
            aria-label="Close booking modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isCompleted ? (
          <div className="flex flex-col items-center mb-6">
            <p
              className="text-center text-[#00C853] text-lg font-semibold"
              aria-live="polite"
            >
              {message}
            </p>
            {Object.keys(bookingDetails).length > 0 && (
              <div className="border-t border-gray-300 pt-4 mt-4 w-full">
                <h3 className="font-medium text-[#1F2937] mb-2">
                  Booking Details:
                </h3>
                <ul className="text-sm space-y-1">
                  {Object.entries(bookingDetails).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium">
                        {key.replace(/_/g, " ")}
                      </span>{" "}
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-[100px] h-[100px]">
              <button
                onClick={stopRecordingManually}
                className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
                  recordingState === "recording"
                    ? "bg-[#FF5722]"
                    : recordingState === "speaking"
                    ? "bg-[#00C853]"
                    : recordingState === "processing"
                    ? "bg-gray-400"
                    : "bg-[#1E90FF]"
                }`}
                aria-label="Stop recording manually"
                disabled={recordingState !== "recording"}
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
              {recordingState === "recording" && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-30 animate-ping-slow"
                    style={{ transform: `scale(${1 + volumeLevel * 0.5})` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-20 animate-ping-slow animation-delay-100"
                    style={{ transform: `scale(${1 + volumeLevel * 0.7})` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-10 animate-ping-slow animation-delay-200"
                    style={{ transform: `scale(${1 + volumeLevel * 1})` }}
                  ></span>
                </>
              )}
              {recordingState === "speaking" && isSpeakingActive && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-30 animate-ping-slow"
                    style={{ transform: `scale(1)` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-20 animate-ping-slow animation-delay-100"
                    style={{ transform: `scale(1.2)` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-10 animate-ping-slow animation-delay-200"
                    style={{ transform: `scale(1.4)` }}
                  ></span>
                </>
              )}
            </div>
            <p
              className={`mt-6 text-center ${
                recordingState === "recording"
                  ? "text-[#FF5722]"
                  : recordingState === "speaking"
                  ? "text-[#00C853]"
                  : "text-[#1F2937]"
              }`}
              aria-live="polite"
            >
              {message}
            </p>
            {Object.keys(bookingDetails).length > 0 && (
              <div className="border-t border-gray-300 pt-4 mt-4 w-full">
                <h3 className="font-medium text-[#1F2937] mb-2">
                  Booking Details:
                </h3>
                <ul className="text-sm space-y-1">
                  {Object.entries(bookingDetails)
                    .filter(([_, value]) => value !== null)
                    .map(([key, value]) => (
                      <li key={key}>
                        <span className="font-medium">
                          {key.replace("_", " ")} :
                        </span>{" "}
                        {value}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
