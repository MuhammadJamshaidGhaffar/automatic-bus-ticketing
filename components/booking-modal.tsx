"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { filterNonNullFields, updateObjectSkippingNulls } from "./functions";
import {
  BookingDetails,
  sendRequestToGemini,
} from "@/actions/sendRequestToGemini";

interface BookingModalProps {
  onClose: () => void;
}

type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "intro";

export default function BookingModal({ onClose }: BookingModalProps) {
  const recordingStateRef = useRef<RecordingState>("intro");
  const [recordingStateUI, setRecordingStateUI] =
    useState<RecordingState>("intro");

  const setRecordingState = (state: RecordingState) => {
    recordingStateRef.current = state;
    setRecordingStateUI(state);
  };

  const [message, setMessage] = useState<string>("Starting...");
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    starting_point: null,
    destination: null,
    date: null,
    seat_number: null,
    customer_name: null,
    phone_number: null,
    departure_time: null,
    confirmed: false,
  });
  const [trigger, setTrigger] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isSpeakingActiveRef = useRef(false);
  const [isSpeakingActiveUI, setIsSpeakingActiveUI] = useState(false);

  const [chatId, updateChatId] = useState(uuidv4());

  const setIsSpeakingActive = (active: boolean) => {
    isSpeakingActiveRef.current = active;
    setIsSpeakingActiveUI(active);
  };

  const [volumeLevel, setVolumeLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isClosingRef = useRef(false);
  const hasGreetedRef = useRef(false);
  const autoInterruptEnabledRef = useRef(true);
  const [autoInterruptEnabledUI, setAutoInterruptEnabledUI] = useState(true);

  const setAutoInterruptEnabled = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    if (typeof value === "function") {
      const newValue = value(autoInterruptEnabledRef.current);
      autoInterruptEnabledRef.current = newValue;
      setAutoInterruptEnabledUI(newValue);
    } else {
      autoInterruptEnabledRef.current = value;
      setAutoInterruptEnabledUI(value);
    }
  };

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

  const onSpeakingStop = () => {
    setIsSpeakingActive(false);
    setRecordingState("idle");
    setMessage("Listening...");
    setTrigger((prev) => !prev);
  };

  const startSpeaking = (narration: string) => {
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = "en-GB";
    utterance.onstart = () => {
      console.log("Speech started...");
      setIsSpeakingActive(true);
      setupSpeechInterruption();
    };
    utterance.onend = () => {
      console.log("Gemini finished speaking, triggering restart...");
      onSpeakingStop();
    };
    speechSynthesis.speak(utterance);
    return utterance;
  };

  const fetchIntroMessage = async () => {
    console.log("Fetching introductory message from Gemini...");
    setRecordingState("processing");
    setMessage("Preparing greeting...");

    try {
      const response = await sendRequestToGemini(
        null,
        bookingDetails,
        true,
        chatId
      );

      console.log("Intro response from Gemini:", response);

      if (response.narration) {
        setRecordingState("speaking");
        setMessage("Agent Speaking ...");
        startSpeaking(response.narration);
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
              false,
              chatId
            );
            console.log("Response from Gemini:", response);

            setBookingDetails((prev) => {
              const updatedDetails = updateObjectSkippingNulls(
                bookingDetails,
                response.updatedBookingDetails
              ) as BookingDetails;

              console.log(
                "Updated bookingDetails:",
                JSON.stringify(updatedDetails)
              );
              return updatedDetails;
            });

            if (response.bookingSuccessful) {
              handleBookingComplete(response.updatedBookingDetails);
            }

            if (response.conversationEnded) handleClose();

            if (response.narration) {
              setRecordingState("speaking");
              setMessage("Agent Speaking ...");

              startSpeaking(response.narration);
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
        // const silenceThreshold = 10;

        // if (average < silenceThreshold) {
        //   if (!silenceTimeoutRef.current) {
        //     silenceTimeoutRef.current = setTimeout(() => {
        //       if (
        //         mediaRecorderRef.current &&
        //         mediaRecorderRef.current.state === "recording"
        //       ) {
        //         console.log("Silence detected, stopping recording...");
        //         mediaRecorderRef.current.stop();
        //         silenceTimeoutRef.current = null;
        //       }
        //     }, 1000); // 1-second silence threshold
        //   }
        // } else {
        //   if (silenceTimeoutRef.current) {
        //     clearTimeout(silenceTimeoutRef.current);
        //     silenceTimeoutRef.current = null;
        //   }
        // }
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
      fetchIntroMessage();
      hasGreetedRef.current = true;
    } else if (recordingStateRef.current === "idle" && !isCompleted) {
      startRecording();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [trigger, isCompleted]);

  const stopRecordingManually = () => {
    console.log("stopRecordingManually called");
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
      setRecordingState("processing");
      setMessage("Processing your request...");
    }
  };

  const stopSpeakingManually = () => {
    console.log("stopSpeakingManually called");
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      console.log("Manual stop speaking triggered...");
      speechSynthesis.cancel();
      onSpeakingStop();
    }
  };

  // Add this function to your component
  const setupSpeechInterruption = () => {
    // Only setup if we're in speaking mode
    if (recordingStateRef.current !== "speaking") return;

    console.log("Setting up speech interruption detection");

    // Create audio context for monitoring
    const audioContext = new AudioContext();
    let analyzer: AnalyserNode;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const source = audioContext.createMediaStreamSource(stream);
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkForSpeech = () => {
          if (
            recordingStateRef.current !== "speaking" ||
            !isSpeakingActiveRef.current
          ) {
            stream.getTracks().forEach((track) => track.stop());
            audioContext.close();
            console.log("resetting speech interruption setup");
            return;
          }

          analyzer.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
          const speechThreshold = 50; // Higher than silence threshold to avoid false triggers

          // Only interrupt if feature is enabled
          if (average > speechThreshold && autoInterruptEnabledRef.current) {
            console.log("User speech detected, stopping assistant speech");
            stopSpeakingManually();
            stream.getTracks().forEach((track) => track.stop());
            audioContext.close();
            return;
          }

          requestAnimationFrame(checkForSpeech);
        };

        requestAnimationFrame(checkForSpeech);
      })
      .catch((err) => {
        console.error("Error setting up speech interruption:", err);
      });
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

          {!isCompleted && (
            <div className="flex items-center">
              <span className="text-xs mr-2 text-gray-600">Auto-Interrupt</span>
              <button
                onClick={() => setAutoInterruptEnabled((prev) => !prev)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  autoInterruptEnabledUI ? "bg-blue-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={autoInterruptEnabledUI}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoInterruptEnabledUI ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

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
                onClick={() => {
                  console.log("mic button clicked");

                  if (recordingStateUI === "recording") stopRecordingManually();

                  if (recordingStateUI === "speaking") stopSpeakingManually();
                }}
                className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
                  recordingStateUI === "recording"
                    ? "bg-[#FF5722]"
                    : recordingStateUI === "speaking"
                    ? "bg-[#00C853]"
                    : recordingStateUI === "processing"
                    ? "bg-gray-400"
                    : "bg-[#1E90FF]"
                }`}
                aria-label={
                  recordingStateUI === "recording"
                    ? "Stop recording"
                    : "Recording not active"
                }
                disabled={
                  recordingStateUI !== "recording" &&
                  recordingStateUI !== "speaking"
                }
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
              {recordingStateUI === "recording" && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-30 animate-ping-slow pointer-events-none"
                    style={{ transform: `scale(${1 + volumeLevel * 0.5})` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-20 animate-ping-slow animation-delay-100 pointer-events-none"
                    style={{ transform: `scale(${1 + volumeLevel * 0.7})` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#FF5722] opacity-10 animate-ping-slow animation-delay-200 pointer-events-none"
                    style={{ transform: `scale(${1 + volumeLevel * 1})` }}
                  ></span>
                </>
              )}
              {recordingStateUI === "speaking" && isSpeakingActiveUI && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-30 animate-ping-slow pointer-events-none"
                    style={{ transform: `scale(1)` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-20 animate-ping-slow animation-delay-100 pointer-events-none"
                    style={{ transform: `scale(1.2)` }}
                  ></span>
                  <span
                    className="absolute inset-0 rounded-full bg-[#00C853] opacity-10 animate-ping-slow animation-delay-200 pointer-events-none"
                    style={{ transform: `scale(1.4)` }}
                  ></span>
                </>
              )}
            </div>
            <p
              className={`mt-6 text-center ${
                recordingStateUI === "recording"
                  ? "text-[#FF5722]"
                  : recordingStateUI === "speaking"
                  ? "text-[#00C853]"
                  : "text-[#1F2937]"
              }`}
              aria-live="polite"
            >
              {message}
            </p>

            {/* User guidance text */}
            <p className="mt-2 text-center text-sm text-gray-500">
              {recordingStateUI === "recording" &&
                "Click mic to stop, or pause speaking for auto-stop"}
              {recordingStateUI === "speaking" &&
                autoInterruptEnabledUI &&
                "Start speaking to interrupt the assistant"}
              {recordingStateUI === "speaking" &&
                !autoInterruptEnabledUI &&
                "Click mic to stop the assistant and speak"}
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
