import React from 'react';

interface WednakLogoProps {
  className?: string;
}

export const WednakLogo: React.FC<WednakLogoProps> = ({
  className = 'w-9 h-9',
}) => (
  <span
    className={`inline-flex shrink-0 overflow-hidden rounded-xl bg-[#0B7D3B] ${className}`}
    aria-label="شعار ويدنك"
  >
    <img
      src="/wednak_logo.png"
      alt="شعار ويدنك"
      className="h-full w-full object-cover"
    />
  </span>
);
