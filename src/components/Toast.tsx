import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  icon?: string;
  isOpen: boolean;
  onClose?: () => void;
  duration?: number;
}

export default function Toast({
  message,
  icon = 'check_circle',
  isOpen,
  onClose,
  duration = 2600,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="app-floating-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-space-md py-space-sm rounded-full shadow-2xl font-label-md text-label-md flex items-center gap-space-sm transition-all duration-300 pointer-events-auto border border-primary-fixed-dim/30 animate-in fade-in slide-in-from-bottom-3"
    >
      <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">
        {icon}
      </span>
      <span>{message}</span>
    </div>
  );
}
