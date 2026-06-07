'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Image from 'next/image';

type AlertType = 'success' | 'error' | 'info';

interface AlertOptions {
  type: AlertType;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options);
    setIsOpen(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsOpen(false);
    // Delay clearing the alert data so it doesn't vanish mid-fade-out
    setTimeout(() => {
      setAlert(null);
    }, 200);
  }, []);

  const handleConfirm = () => {
    if (alert?.onConfirm) {
      alert.onConfirm();
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-navy/80 backdrop-blur-md"
            onClick={hideAlert}
          />

          {/* Alert Card container */}
          <div
            className={`relative bg-card border border-borderLine rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-6 transition-all duration-300 transform ${
              isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
            }`}
          >
            {/* Top Close Button */}
            <button
              onClick={hideAlert}
              className="absolute top-4 right-4 text-textMuted hover:text-textLight transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Visual Icon Header depending on Alert Type */}
            <div className="w-20 h-20 flex items-center justify-center rounded-full relative">
              {alert.type === 'success' && (
                <div className="w-full h-full rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center text-mint">
                  <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {alert.type === 'error' && (
                <div className="w-full h-full rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              {alert.type === 'info' && (
                <div className="w-full h-full rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Typography info details */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-black text-textLight tracking-tight">
                {alert.title}
              </h3>
              <p className="text-sm text-textMuted leading-relaxed max-w-[280px] break-words">
                {alert.message}
              </p>
            </div>

            {/* CTA action buttons */}
            <button
              onClick={handleConfirm}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                alert.type === 'success'
                  ? 'bg-mint text-navy hover:shadow-mint/20'
                  : alert.type === 'error'
                  ? 'bg-red-500 text-white hover:shadow-red-500/20 hover:bg-red-600'
                  : 'bg-violet-500 text-white hover:shadow-violet-500/20 hover:bg-violet-600'
              }`}
            >
              {alert.confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
