"use client";

import { Mic, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingModal from "@/components/booking-modal";
import { useState } from "react";

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#1F2937]">TravelVoice</h1>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E90FF] hover:bg-[#1873CC] text-white rounded-full flex items-center gap-2"
            aria-label="Start audio booking"
          >
            <Mic className="w-4 h-4" />
            <span>Start Booking</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1F2937] mb-4">
            Book Your Journey with Voice
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Fast, easy, and hands-free transportation booking
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E90FF] hover:bg-[#1873CC] text-white px-8 py-4 rounded-full flex items-center gap-2 mx-auto"
            aria-label="Start audio booking"
          >
            <Mic className="w-5 h-5" />
            <span className="text-lg">Start Booking</span>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-2xl font-bold text-center text-[#1F2937] mb-12">
            Why Choose TravelVoice?
          </h3>
          <div className="flex flex-col md:flex-row gap-8 justify-center">
            {/* Feature Card 1 */}
            <div className="flex-1 bg-[#E5E7EB] rounded-lg shadow-md p-6 flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-4">
                <Mic className="w-8 h-8 text-[#1E90FF]" />
              </div>
              <h4 className="text-lg font-semibold text-[#1F2937] mb-2">
                Voice-Powered Booking
              </h4>
              <p className="text-sm text-gray-600">
                Speak to book your seat instantly
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="flex-1 bg-[#E5E7EB] rounded-lg shadow-md p-6 flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-4">
                <Clock className="w-8 h-8 text-[#1E90FF]" />
              </div>
              <h4 className="text-lg font-semibold text-[#1F2937] mb-2">
                Real-Time Updates
              </h4>
              <p className="text-sm text-gray-600">
                Get instant feedback and confirmations
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="flex-1 bg-[#E5E7EB] rounded-lg shadow-md p-6 flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-[#1E90FF]" />
              </div>
              <h4 className="text-lg font-semibold text-[#1F2937] mb-2">
                Seamless Experience
              </h4>
              <p className="text-sm text-gray-600">No typing, just talking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-4 bg-[#F9FAFB] text-center">
        <p className="text-sm text-gray-500">
          © 2025 TravelVoice. All rights reserved.
        </p>
      </footer>

      {/* Booking Modal */}
      {isModalOpen && <BookingModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
