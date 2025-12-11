"use client"
import { useEffect } from "react"

export default function Toast({ message, type = "info", onClose }: { message: string, type?: "info"|"error"|"success"|"loading", onClose?: () => void }) {
  useEffect(() => {
    if (type !== "loading") {
      const timer = setTimeout(() => {
        onClose?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  let color = "bg-gray-900 text-white";
  if (type === "error") color = "bg-red-600 text-white";
  if (type === "success") color = "bg-green-600 text-white";
  if (type === "loading") color = "bg-blue-600 text-white animate-pulse";

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-3 rounded-lg shadow-lg font-medium text-sm ${color}`}
      role="alert"
    >
      {message}
    </div>
  );
}
