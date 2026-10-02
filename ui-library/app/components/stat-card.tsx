import { Card, CardContent, CardHeader, CardTitle } from "sluurp/kit/card.js";

export interface StatCardProps {
  /** What is counted. */
  label?: string;
  value?: string | number;
  /** The change since last time, in percent: green up, red down. */
  change?: number;
  className?: string;
}

/** One number that matters, with how it moved. */
export function StatCard({ label = "", value = "", change, className }: StatCardProps = {}) {
  return <Card className={className}>
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-semibold tabular-nums">{value}</span>
        {change === undefined ? "" : (
          <span class={`text-sm font-medium ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        )}
      </div>
    </CardContent>
  </Card>;
}
