/**
 * SVG Drone illustration — reused in hero + dashboard.
 * Top-down quadcopter silhouette.
 */

interface DroneGraphicProps {
  className?: string;
  size?: number;
  color?: string;
}

export function DroneGraphic({ className = "", size = 120, color = "currentColor" }: DroneGraphicProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Center body */}
      <rect x="50" y="50" width="20" height="20" rx="4" fill={color} opacity="0.9" />

      {/* Arms */}
      <line x1="60" y1="50" x2="30" y2="20" stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1="60" y1="50" x2="90" y2="20" stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1="60" y1="70" x2="30" y2="100" stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1="60" y1="70" x2="90" y2="100" stroke={color} strokeWidth="2" opacity="0.7" />

      {/* Rotors */}
      <circle cx="30" cy="20" r="14" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />
      <circle cx="90" cy="20" r="14" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />
      <circle cx="30" cy="100" r="14" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />
      <circle cx="90" cy="100" r="14" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />

      {/* Rotor centers */}
      <circle cx="30" cy="20" r="3" fill={color} opacity="0.8" />
      <circle cx="90" cy="20" r="3" fill={color} opacity="0.8" />
      <circle cx="30" cy="100" r="3" fill={color} opacity="0.8" />
      <circle cx="90" cy="100" r="3" fill={color} opacity="0.8" />

      {/* Camera lens */}
      <circle cx="60" cy="60" r="5" stroke={color} strokeWidth="1.5" fill="none" opacity="0.9" />
      <circle cx="60" cy="60" r="2" fill={color} opacity="0.9" />
    </svg>
  );
}
