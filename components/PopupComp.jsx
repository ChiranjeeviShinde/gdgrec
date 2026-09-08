"use client";

import React from "react";

const PopupComp = ({ isOpen, onClose, PopupData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-7 py-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {PopupData?.header}
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {PopupData?.description}
          </p>
        </div>

        <div className="px-7 py-6">
          <ul className="space-y-3">
            {PopupData?.message?.map((message, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm leading-6 text-zinc-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end border-t border-zinc-100 bg-zinc-50 px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupComp;
