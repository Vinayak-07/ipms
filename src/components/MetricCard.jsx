"use client";

export default function MetricCard({
  title,
  value,
  unit = "",
  subtitle,
  icon: Icon,
  glowClass = "",
  accentColor = "rgba(255,255,255,0.5)",
}) {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 ${glowClass}`}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </span>
        {Icon && (
          <Icon
            className="h-5 w-5"
            style={{ color: accentColor, opacity: 0.85 }}
          />
        )}
      </div>
      <div className="mb-1">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {value ?? "--"}
        </span>
        {unit && (
          <span
            className="ml-1 text-lg font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <p
          className="text-xs mt-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
