"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingModal from "@/components/booking-modal";

export default function BookingAssistant() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-[#1E90FF] hover:bg-[#1873CC] text-white px-6 py-6 rounded-full flex items-center gap-2"
        aria-label="Start audio booking"
      >
        <Mic className="w-5 h-5" />
        <span className="text-lg">Start Booking</span>
      </Button>

      {isModalOpen && <BookingModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
