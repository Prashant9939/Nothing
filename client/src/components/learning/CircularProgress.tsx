interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CircularProgress({ 
  value, 
  size = 80, 
  strokeWidth = 8, 
  className = '' 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (percent: number) => {
    // Burnt-family progress scale: red when critically low, amber when
    // mid, burnt once healthy — never green (student palette).
    if (percent >= 70) return '#d9541e';
    if (percent >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e6dfd1"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-sm font-bold text-ink">
        {value}%
      </span>
    </div>
  );
}
