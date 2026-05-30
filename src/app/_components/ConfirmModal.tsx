/**
 * ConfirmModal — a reusable animated confirmation dialog.
 *
 * Replaces the native `confirm()` browser dialog with a styled X-like modal.
 * Uses framer-motion for a spring-based scale + fade animation on mount/unmount.
 * Clicking the dark backdrop calls onCancel. Clicking inside the card stops
 * propagation so it doesn't close inadvertently.
 *
 * Props:
 *   open         — visibility toggle (rendered inside AnimatePresence)
 *   title        — bold heading (e.g. "Delete post?")
 *   message      — body text explaining the consequence
 *   confirmLabel — defaults to "Delete", shown on the red action button
 *   onConfirm    — called when user clicks the red button
 *   onCancel     — called when user clicks Cancel or the backdrop
 */
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;    // custom label for the confirm button (default: "Delete")
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    // AnimatePresence handles enter/exit animations when open toggles
    <AnimatePresence>
      {open && (
        // ── Backdrop (semi-transparent black overlay) ──────────────────────────
        // Clicking the backdrop acts the same as pressing Cancel
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          {/* ── Modal Card ────────────────────────────────────────────────────── */}
          {/* stopPropagation prevents backdrop click when clicking inside the card */}
          <motion.div
            className="bg-black border border-neutral-700 rounded-2xl w-[90%] max-w-[320px] p-6 shadow-xl"
            // Spring animation: scales up from 0.9 + fades in
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
            {/* Message / description */}
            <p className="text-neutral-400 text-[15px] mb-6">{message}</p>

            {/* Action buttons — stacked vertically */}
            <div className="flex flex-col gap-2">
              {/* Confirm — red filled button, draws attention to destructive action */}
              <button
                onClick={onConfirm}
                className="w-full py-3 rounded-full font-bold text-[15px] text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {confirmLabel}
              </button>
              {/* Cancel — outlined style, neutral */}
              <button
                onClick={onCancel}
                className="w-full py-3 rounded-full font-bold text-[15px] text-white border border-neutral-600 hover:bg-neutral-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
