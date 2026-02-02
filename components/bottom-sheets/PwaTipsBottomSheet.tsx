"use client";

interface PwaTipsBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PwaTipsBottomSheet({
  open,
  onClose,
}: PwaTipsBottomSheetProps) {
  return (
    <div className="fixed inset-0 z-50 max-[900px]:block hidden pointer-events-none">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <button
        className={`absolute inset-0 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-label="Close add to home screen"
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 p-4 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"} pointer-events-auto`}
      >
        <div className="mx-auto mb-0.5 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Add to Home Screen
        </h3>
        <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              iOS (Safari)
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Tap the Share button.</li>
              <li>Choose &quot;Add to Home Screen&quot;.</li>
              <li>Confirm by tapping &quot;Add&quot;.</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Android (Chrome)
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Tap the menu (⋮).</li>
              <li>Select &quot;Add to Home screen&quot;.</li>
              <li>Confirm by tapping &quot;Add&quot;.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
