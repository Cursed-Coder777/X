"use client";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="bg-black border border-neutral-700 rounded-2xl w-[90%] max-w-[320px] p-6 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
            <p className="text-neutral-400 text-[15px] mb-6">{message}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirm}
                className="w-full py-3 rounded-full font-bold text-[15px] text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {confirmLabel}
              </button>
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
