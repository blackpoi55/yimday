"use client";

import { ReactNode, useEffect } from "react";

type LegacyModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function LegacyModal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: LegacyModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="legacy-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className={`legacy-modal legacy-modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="legacy-modal-header">
          <h4>{title}</h4>
          <button className="legacy-modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>
        <div className="legacy-modal-body">{children}</div>
        {footer ? <div className="legacy-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
