interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  priority: 'low' | 'medium' | 'high';
  showPercentage?: boolean;
}

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  priority,
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const priorityColors = {
    high: { from: '#ef4444', to: '#dc2626', stroke: 'url(#gradient-high)' },
    medium: { from: '#f59e0b', to: '#d97706', stroke: 'url(#gradient-medium)' },
    low: { from: '#3b82f6', to: '#2563eb', stroke: 'url(#gradient-low)' }
  };

  const color = priorityColors[priority];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gradient-high" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="gradient-medium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="gradient-low" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground">{value}%</span>
        </div>
      )}
    </div>
  );
}
