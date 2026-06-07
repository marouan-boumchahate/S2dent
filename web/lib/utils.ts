import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFriendlyErrorMessage(error: any, fallbackMessage: string): string {
  if (!error) return fallbackMessage;

  const msg = (error.message || '').toLowerCase();
  const code = error.code;

  // Check for signature rejection / denial / MetaMask refusal
  if (
    code === 4001 || 
    code === 'ACTION_REJECTED' || 
    msg.includes('user rejected') || 
    msg.includes('user denied') || 
    msg.includes('rejected') || 
    msg.includes('declined')
  ) {
    return 'The request was declined in your wallet. Please approve the prompt in MetaMask to complete the transaction.';
  }

  // Network switch / chain ID errors
  if (msg.includes('wallet_switchethereumchain') || msg.includes('switch chain') || msg.includes('chainid')) {
    return 'We could not switch to the required local blockchain network. Please verify that your MetaMask contains the correct Localhost network settings.';
  }

  // Contract execution reversion
  if (msg.includes('execution reverted') || msg.includes('revert')) {
    return 'The transaction failed on the blockchain. This might be due to incorrect permissions or contract rules.';
  }

  // Fallback to error message if it is relatively clean and brief
  if (error.message && error.message.length < 120 && !error.message.includes('stack trace') && !error.message.includes('http://')) {
    return error.message;
  }

  return fallbackMessage;
}