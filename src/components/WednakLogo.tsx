import React from 'react';

interface WednakLogoProps {
  className?: string;
}

export const WednakLogo: React.FC<WednakLogoProps> = ({
  className = 'w-9 h-9',
}) => (
  <span
    className={`wednak-modal-logo inline-flex shrink-0 items-center justify-center ${className}`}
    aria-label="شعار ويدنك"
  >
    <img
      src="/wednak-mark-green.svg"
      alt="شعار ويدنك"
      className="h-full w-full object-contain"
    />
  </span>
);
