import React from 'react';

// Logo component using the uploaded 1bio logo
// URL: https://customer-assets.emergentagent.com/job_open-files/artifacts/i96chbkh_1bio-trans.png

const Logo = ({ className = "", size = "default" }) => {
  const sizes = {
    xs: "h-4",
    sm: "h-6",
    default: "h-8",
    lg: "h-10",
    xl: "h-12",
  };

  return (
    <img
      src="https://customer-assets.emergentagent.com/job_open-files/artifacts/i96chbkh_1bio-trans.png"
      alt="1bio"
      className={`${sizes[size] || sizes.default} w-auto object-contain ${className}`}
    />
  );
};

// Text logo for inline use
const LogoText = ({ className = "" }) => {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-white">1</span>
      <span className="text-white">bio</span>
    </span>
  );
};

// Logo with text for footer/powered by
const LogoWithText = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Logo size="xs" />
      <span className="text-xs text-gray-500">.cc</span>
    </div>
  );
};

export { Logo, LogoText, LogoWithText };
export default Logo;
