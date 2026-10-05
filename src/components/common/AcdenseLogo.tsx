import * as React from "react";
import { cn } from "@/lib/utils";

export interface AcdenseLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  withContainer?: boolean;
  containerClassName?: string;
}

export const AcdenseIcon: React.FC<AcdenseLogoProps> = ({ size = 20, className, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="48" height="48" rx="11" fill="#121B1B" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="10.25"
        stroke="#70C08E"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M14.25 6 H39 L31.875 18.75 H42.75 L28.125 42 H24.375 V32.25 H10.875 L18 19.5 H5.25 L14.25 6 Z"
        fill="#70C08E"
      />
    </svg>
  );
};

export const AcdenseLogo: React.FC<{
  className?: string;
  iconSize?: number;
  showSubtitle?: boolean;
}> = ({ className, iconSize = 32, showSubtitle = true }) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <AcdenseIcon size={iconSize} />
      <div className="flex flex-col text-left">
        <span className="text-sm sm:text-base font-bold font-heading text-foreground leading-none">
          Acdense
        </span>
        {showSubtitle && (
          <span className="hidden sm:inline-block text-[10px] text-foreground-lighter font-normal mt-1 leading-none">
            Academic Command Center
          </span>
        )}
      </div>
    </div>
  );
};
