import { useId, useMemo, useState } from "react";
import { CalendarDays, Star, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import type { MetaLoadout } from "@/hooks/useMetaData";

const MIN_RATING_VOTES = 5;
const META_ACCENT = "#f4f1ea";

type ChartRange = "7d" | "14d" | "30d" | "6m";

interface TrendPoint {
  label: string;
  fullLabel: string;
  loadouts: number;
  rating: number | null;
  ratedBuilds: number;
}

const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "6m", label: "6 months" },
];

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratingTier(score: number | null) {
  if (score == null) return "—";
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildTrendData(
  loadouts: MetaLoadout[],
  range: ChartRange,
): TrendPoint[] {
  const today = startOfDay(new Date());
  const end = addDays(today, 1);
  const weekly = range === "6m";
  let start: Date;

  if (weekly) {
    start = new Date(today);
    start.setMonth(start.getMonth() - 6);
  } else {
    const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    start = addDays(today, -(days - 1));
  }

  const parsedLoadouts = loadouts
    .map((loadout) => ({ loadout, createdAt: new Date(loadout.createdAt) }))
    .filter(({ createdAt }) => !Number.isNaN(createdAt.getTime()));
  const points: TrendPoint[] = [];

  for (
    let cursor = start;
    cursor < end;
    cursor = addDays(cursor, weekly ? 7 : 1)
  ) {
    const bucketEnd = new Date(
      Math.min(addDays(cursor, weekly ? 7 : 1).getTime(), end.getTime()),
    );
    const bucket = parsedLoadouts
      .filter(({ createdAt }) => createdAt >= cursor && createdAt < bucketEnd)
      .map(({ loadout }) => loadout);
    const rated = bucket.filter(
      (loadout) =>
        loadout.ratingPercent != null &&
        loadout.likes + loadout.dislikes >= MIN_RATING_VOTES,
    );

    points.push({
      label: formatDay(cursor),
      fullLabel: weekly
        ? `${formatDay(cursor)} – ${formatDay(addDays(bucketEnd, -1))}`
        : formatDay(cursor),
      loadouts: bucket.length,
      rating:
        rated.length > 0
          ? Math.round(
              average(rated.map((loadout) => loadout.ratingPercent as number)),
            )
          : null,
      ratedBuilds: rated.length,
    });
  }

  return points;
}

function PopularityTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#121011] px-3 py-2 shadow-xl">
      <p className="text-xs text-teritary">{point.fullLabel}</p>
      <p className="mt-1 text-sm font-medium text-[#fafafa]">
        {point.loadouts} loadout{point.loadouts === 1 ? "" : "s"} created
      </p>
    </div>
  );
}

function RatingTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#121011] px-3 py-2 shadow-xl">
      <p className="text-xs text-teritary">{point.fullLabel}</p>
      <p className="mt-1 text-sm font-medium text-[#fafafa]">
        {point.rating == null
          ? "No qualified ratings"
          : `${ratingTier(point.rating)} tier • ${point.ratedBuilds} rated build${point.ratedBuilds === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

interface MetaTrendChartsProps {
  loadouts: MetaLoadout[];
  entityName: string;
  title: string;
  popularityTitle: string;
  popularityDescription: string;
}

export function MetaTrendCharts({
  loadouts,
  entityName,
  title,
  popularityTitle,
  popularityDescription,
}: MetaTrendChartsProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("30d");
  const gradientId = `meta-rating-${useId().replace(/:/g, "")}`;
  const trendData = useMemo(
    () => buildTrendData(loadouts, chartRange),
    [loadouts, chartRange],
  );
  const rangeLoadoutCount = trendData.reduce(
    (sum, point) => sum + point.loadouts,
    0,
  );
  const rangeRatedBuilds = trendData.reduce(
    (sum, point) => sum + point.ratedBuilds,
    0,
  );
  const rangeAverageRating =
    rangeRatedBuilds > 0
      ? Math.round(
          trendData.reduce(
            (sum, point) => sum + (point.rating ?? 0) * point.ratedBuilds,
            0,
          ) / rangeRatedBuilds,
        )
      : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base">{title}</h2>
        </div>
        <FilterPillGroup
          type="single"
          value={chartRange}
          onValueChange={(value) => value && setChartRange(value as ChartRange)}
        >
          {CHART_RANGES.map((range) => (
            <FilterPill key={range.value} value={range.value} size="sm">
              {range.label}
            </FilterPill>
          ))}
        </FilterPillGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-secondary" />
                <h3 className="font-sans text-sm text-secondary">
                  {popularityTitle}
                </h3>
              </div>
              <p className="mt-1 text-xs text-teritary">
                {popularityDescription}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl ">{rangeLoadoutCount}</p>
              <p className="text-xs text-teritary">new builds</p>
            </div>
          </div>
          <div
            className="h-64 w-full"
            role="img"
            aria-label={`${entityName} loadouts created over time`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.07)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tick={{ fill: "#8d898a", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8d898a", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.035)" }}
                  content={<PopularityTooltip />}
                />
                <Bar
                  dataKey="loadouts"
                  fill={META_ACCENT}
                  fillOpacity={0.76}
                  radius={[5, 5, 1, 1]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-sm text-secondary">
                  Community rating
                </h3>
              </div>
              <p className="mt-1 text-xs text-teritary">
                Average tier of qualified builds created in this period
              </p>
            </div>
            <div className="text-right">
              <p className="font-rating text-2xl ">
                {ratingTier(rangeAverageRating)}
              </p>
              <p className="text-xs text-teritary">average tier</p>
            </div>
          </div>
          <div
            className="relative h-64 w-full"
            role="img"
            aria-label={`${entityName} community rating over time`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={META_ACCENT}
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor={META_ACCENT}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.07)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tick={{ fill: "#8d898a", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[20, 50, 68, 82, 95]}
                  tickFormatter={(value) => ratingTier(Number(value))}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8d898a", fontSize: 11 }}
                />
                <Tooltip content={<RatingTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rating"
                  stroke={META_ACCENT}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  connectNulls
                  activeDot={{
                    r: 5,
                    fill: "#0a0909",
                    stroke: META_ACCENT,
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {rangeRatedBuilds === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-8 text-center text-sm text-teritary">
                No qualified ratings in this period
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
