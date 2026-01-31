"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import { AreaClosed, Line, Bar, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { GridRows } from "@visx/grid";
import { scaleLinear } from "@visx/scale";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { bisector } from "d3-array";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { Brush } from "@visx/brush";
import { PatternLines } from "@visx/pattern";
import BaseBrush from "@visx/brush/lib/BaseBrush";
import { Bounds } from "@visx/brush/lib/types";
import { useGPX } from "@/context/GPXContext";
import type { EnhancedPoint, SegmentStats, Climb } from "@/lib/gpx/types";
import { getClimbCategoryColor } from "@/lib/calculations/climbs";

const chartSeparation = 30;
const PATTERN_ID = "brush_pattern";
const GRADIENT_ID = "brush_gradient";
const selectedBrushStyle = {
  fill: `url(#${PATTERN_ID})`,
  stroke: "white",
};

const bisectDistance = bisector<EnhancedPoint, number>((d) => d.distance).left;

const tooltipStyles = {
  ...defaultStyles,
  background: "rgba(0, 0, 0, 0.9)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "4px",
  fontSize: "12px",
};

interface ElevationChartProps {
  width: number;
  height: number;
}

export default function ElevationChart({ width, height }: ElevationChartProps) {
  const isMobile = width < 640;
  const margin = useMemo(
    () => ({
      top: 18,
      right: isMobile ? 34 : 60,
      bottom: isMobile ? 32 : 40,
      left: isMobile ? 36 : 60,
    }),
    [isMobile]
  );
  const brushMargin = useMemo(
    () => ({
      top: 10,
      bottom: 12,
      left: isMobile ? 36 : 60,
      right: isMobile ? 34 : 60,
    }),
    [isMobile]
  );
  const { data, setHoverPoint, routeWindData, selectedClimbIndex, lapCount } =
    useGPX();
  const brushRef = useRef<BaseBrush | null>(null);
  const [filteredData, setFilteredData] = useState<EnhancedPoint[] | null>(
    null,
  );
  const [segmentStats, setSegmentStats] = useState<SegmentStats | null>(null);
  const [hoveredClimb, setHoveredClimb] = useState<Climb | null>(null);

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<EnhancedPoint>();

  const lappedPoints = useMemo(() => {
    if (!data) return [];
    if (lapCount <= 1) return data.points;

    const singleLapDistance = data.stats.totalDistance;
    const result: EnhancedPoint[] = [];

    for (let lap = 0; lap < lapCount; lap++) {
      const offset = lap * singleLapDistance;
      for (const point of data.points) {
        result.push({
          ...point,
          distance: point.distance + offset,
        });
      }
    }

    return result;
  }, [data, lapCount]);

  const lappedClimbs = useMemo(() => {
    if (!data) return [];
    if (lapCount <= 1) return data.climbs;

    const singleLapDistance = data.stats.totalDistance;
    const result: Climb[] = [];

    for (let lap = 0; lap < lapCount; lap++) {
      const offset = lap * singleLapDistance;
      for (const climb of data.climbs) {
        result.push({
          ...climb,
          startDistance: climb.startDistance + offset,
          endDistance: climb.endDistance + offset,
        });
      }
    }

    return result;
  }, [data, lapCount]);

  const brushHeight = 60;
  const topChartHeight = height - brushHeight - chartSeparation;
  const xMax = width - margin.left - margin.right;
  const yMax = topChartHeight - margin.top - margin.bottom;

  const brushXScale = useMemo(() => {
    if (!data) return scaleLinear({ domain: [0, 1], range: [0, xMax] });

    const maxDistance = Math.max(...lappedPoints.map((p) => p.distance));
    return scaleLinear({
      domain: [0, maxDistance],
      range: [0, xMax],
    });
  }, [data, lappedPoints, xMax]);

  const brushYScale = useMemo(() => {
    if (!data || !data.hasElevation) {
      return scaleLinear({
        domain: [0, 100],
        range: [brushHeight - brushMargin.top - brushMargin.bottom, 0],
      });
    }

    const elevations = lappedPoints.map((p) => p.elevation ?? 0);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const padding = (maxElev - minElev) * 0.1 || 10;

    return scaleLinear({
      domain: [minElev - padding, maxElev + padding],
      range: [brushHeight - brushMargin.top - brushMargin.bottom, 0],
    });
  }, [data, lappedPoints, brushHeight]);

  const onBrushChange = useCallback(
    (domain: Bounds | null) => {
      if (!domain || !data) {
        setFilteredData(null);
        setSegmentStats(null);
        return;
      }

      const { x0, x1 } = domain;
      const filtered = lappedPoints.filter((p) => {
        const x = p.distance;
        return x >= x0 && x <= x1;
      });

      setFilteredData(filtered);

      if (filtered.length > 0) {
        const segElevations = filtered.map((p) => p.elevation ?? 0);
        const segmentGain = filtered.reduce((sum, p, i) => {
          if (i === 0) return 0;
          const diff = (p.elevation ?? 0) - (filtered[i - 1].elevation ?? 0);
          return sum + (diff > 6 ? diff : 0);
        }, 0);
        const segmentLoss = filtered.reduce((sum, p, i) => {
          if (i === 0) return 0;
          const diff = (filtered[i - 1].elevation ?? 0) - (p.elevation ?? 0);
          return sum + (diff > 6 ? diff : 0);
        }, 0);

        const stats: SegmentStats = {
          startDistance: x0,
          endDistance: x1,
          totalDistance: x1 - x0,
          totalElevationGain: segmentGain,
          totalElevationLoss: segmentLoss,
          minElevation: Math.min(...segElevations),
          maxElevation: Math.max(...segElevations),
          totalTime: null,
          movingTime: null,
          avgSpeed: null,
          maxSpeed: null,
        };
        setSegmentStats(stats);
      }
    },
    [data, lappedPoints],
  );

  const initialBrushPosition = useMemo(() => {
    if (!data || lappedPoints.length === 0) return undefined;
    const maxDist = Math.max(...lappedPoints.map((p) => p.distance));
    return {
      start: { x: maxDist * 0.25 },
      end: { x: maxDist * 0.75 },
    };
  }, [data, lappedPoints]);

  const displayData = filteredData || lappedPoints;

  const yScale = useMemo(() => {
    if (!data || !data.hasElevation) {
      return scaleLinear({ domain: [0, 100], range: [yMax, 0] });
    }

    const elevations = displayData.map((p) => p.elevation ?? 0);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const padding = (maxElev - minElev) * 0.1 || 10;

    return scaleLinear({
      domain: [minElev - padding, maxElev + padding],
      range: [yMax, 0],
    });
  }, [displayData, yMax, data]);

  const xScale = useMemo(() => {
    if (!data) return scaleLinear({ domain: [0, 1], range: [0, xMax] });

    if (filteredData && filteredData.length > 0) {
      const minDist = Math.min(...filteredData.map((p) => p.distance));
      const maxDist = Math.max(...filteredData.map((p) => p.distance));
      return scaleLinear({
        domain: [minDist, maxDist],
        range: [0, xMax],
      });
    }

    const maxDistance = Math.max(...lappedPoints.map((p) => p.distance));
    return scaleLinear({
      domain: [0, maxDistance],
      range: [0, xMax],
    });
  }, [data, filteredData, lappedPoints, xMax]);

  const windYScale = useMemo(() => {
    if (routeWindData.length === 0) {
      return scaleLinear({ domain: [0, 15], range: [yMax, 0] });
    }

    const maxWind = Math.max(
      ...routeWindData.map((w) => Math.max(w.windSpeed, w.windGust)),
    );
    const paddedMax = Math.ceil(maxWind / 5) * 5 + 2;

    return scaleLinear({
      domain: [0, paddedMax],
      range: [yMax, 0],
    });
  }, [routeWindData, yMax]);

  const windSamples = useMemo(() => {
    return [...routeWindData].sort((a, b) => a.distance - b.distance);
  }, [routeWindData]);

  const interpolatedWindData = useMemo(() => {
    if (windSamples.length < 2 || !data) return [];

    const result: Array<{
      distance: number;
      windSpeed: number;
      windGust: number;
    }> = [];
    const sortedWind = windSamples;

    for (const point of displayData) {
      const d = point.distance;

      if (d <= sortedWind[0].distance) {
        result.push({
          distance: d,
          windSpeed: sortedWind[0].windSpeed,
          windGust: sortedWind[0].windGust,
        });
        continue;
      }
      if (d >= sortedWind[sortedWind.length - 1].distance) {
        const last = sortedWind[sortedWind.length - 1];
        result.push({
          distance: d,
          windSpeed: last.windSpeed,
          windGust: last.windGust,
        });
        continue;
      }

      let i = 0;
      while (i < sortedWind.length - 1 && sortedWind[i + 1].distance < d) {
        i++;
      }

      const w0 = sortedWind[i];
      const w1 = sortedWind[i + 1];
      const t = (d - w0.distance) / (w1.distance - w0.distance);

      result.push({
        distance: d,
        windSpeed: w0.windSpeed + t * (w1.windSpeed - w0.windSpeed),
        windGust: w0.windGust + t * (w1.windGust - w0.windGust),
      });
    }

    return result;
  }, [windSamples, displayData, data]);

  const getWindAtDistance = useCallback(
    (distance: number) => {
      if (windSamples.length === 0) return null;

      const bisectDist = bisector<{ distance: number }, number>(
        (d) => d.distance,
      ).left;
      const index = bisectDist(windSamples, distance, 1);
      const d0 = windSamples[index - 1];
      const d1 = windSamples[index];

      if (!d0) return d1 || null;
      if (!d1) return d0;

      return distance - d0.distance > d1.distance - distance ? d1 : d0;
    },
    [windSamples],
  );

  const handleTooltip = useCallback(
    (
      event:
        | React.TouchEvent<SVGRectElement>
        | React.MouseEvent<SVGRectElement>,
    ) => {
      if (!data || lappedPoints.length === 0) return;

      const point = localPoint(event);
      if (!point) return;

      const x0 = xScale.invert(point.x - margin.left);
      const index = bisectDistance(lappedPoints, x0, 1);
      const d0 = lappedPoints[index - 1];
      const d1 = lappedPoints[index];

      if (!d0 || !d1) return;

      const d = x0 - d0.distance > d1.distance - x0 ? d1 : d0;
      const actualIndex = lappedPoints.indexOf(d);

      const currentClimb = lappedClimbs.find(
        (climb) =>
          d.distance >= climb.startDistance && d.distance <= climb.endDistance,
      );
      setHoveredClimb(currentClimb || null);

      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(d.distance) + margin.left,
        tooltipTop: yScale(d.elevation ?? 0) + margin.top,
      });

      setHoverPoint(d, actualIndex);
    },
    [
      data,
      lappedPoints,
      lappedClimbs,
      xScale,
      yScale,
      showTooltip,
      setHoverPoint,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
    setHoverPoint(null, null);
    setHoveredClimb(null);
  }, [hideTooltip, setHoverPoint]);

  if (!data || !data.hasElevation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        {data
          ? "No elevation data available"
          : "Upload a GPX file to see elevation profile"}
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient
          id="area-gradient"
          from="#3b82f6"
          to="#3b82f6"
          toOpacity={0.2}
        />

        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={xMax}
            strokeDasharray="2,2"
            stroke="rgba(0,0,0,0.1)"
          />

          {lappedClimbs.map((climb, i) => {
            const x1 = xScale(climb.startDistance);
            const x2 = xScale(climb.endDistance);
            const climbWidth = x2 - x1;
            if (climbWidth <= 0) return null;

            const isSelected = selectedClimbIndex === i;

            return (
              <rect
                key={`climb-${i}`}
                x={x1}
                y={0}
                width={climbWidth}
                height={yMax}
                fill={
                  isSelected ? "#f59e0b" : getClimbCategoryColor(climb.category)
                }
                fillOpacity={isSelected ? 0.4 : 0.15}
                stroke={isSelected ? "#f59e0b" : "none"}
                strokeWidth={isSelected ? 2 : 0}
              />
            );
          })}

          <AreaClosed<EnhancedPoint>
            data={displayData}
            x={(d) => xScale(d.distance)}
            y={(d) => yScale(d.elevation ?? 0)}
            yScale={yScale}
            strokeWidth={2}
            stroke="url(#area-gradient)"
            fill="url(#area-gradient)"
            curve={curveMonotoneX}
          />

          {interpolatedWindData.length > 0 && (
            <>
              <LinePath
                data={interpolatedWindData}
                x={(d) => xScale(d.distance)}
                y={(d) => windYScale(d.windGust)}
                stroke="#f472b6"
                strokeWidth={1.5}
                strokeOpacity={0.8}
                curve={curveMonotoneX}
              />
              <LinePath
                data={interpolatedWindData}
                x={(d) => xScale(d.distance)}
                y={(d) => windYScale(d.windSpeed)}
                stroke="#2563eb"
                strokeWidth={2}
                curve={curveMonotoneX}
              />
              {windSamples.map((sample) => (
                <g key={`wind-sample-${sample.distance}`}>
                  <circle
                    cx={xScale(sample.distance)}
                    cy={windYScale(sample.windSpeed)}
                    r={3}
                    fill="#2563eb"
                    stroke="white"
                    strokeWidth={1}
                  />
                  <circle
                    cx={xScale(sample.distance)}
                    cy={windYScale(sample.windGust)}
                    r={3}
                    fill="#f472b6"
                    stroke="white"
                    strokeWidth={1}
                  />
                </g>
              ))}
            </>
          )}

          {tooltipData && (
            <>
              <Line
                from={{ x: tooltipLeft! - margin.left, y: 0 }}
                to={{ x: tooltipLeft! - margin.left, y: yMax }}
                stroke="#6b7280"
                strokeWidth={1}
                pointerEvents="none"
                strokeDasharray="4,2"
              />
              <circle
                cx={tooltipLeft! - margin.left}
                cy={tooltipTop! - margin.top}
                r={4}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </>
          )}

          <Bar
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={handleMouseLeave}
          />

          <AxisBottom
            top={yMax}
            scale={xScale}
            numTicks={5}
            label="Distance (km)"
            labelProps={{
              fontSize: 12,
              textAnchor: "middle",
              fill: "#6b7280",
            }}
            tickLabelProps={() => ({
              fontSize: 10,
              textAnchor: "middle",
              fill: "#6b7280",
            })}
            tickFormat={(d) => (Number(d) / 1000).toFixed(1)}
          />

          <AxisLeft
            scale={yScale}
            numTicks={5}
            label="Elevation (m)"
            labelProps={{
              fontSize: 12,
              textAnchor: "middle",
              fill: "#6b7280",
            }}
            tickLabelProps={() => ({
              fontSize: 10,
              textAnchor: "end",
              fill: "#6b7280",
              dx: -4,
            })}
            tickFormat={(d) => Math.round(Number(d)).toString()}
          />

          {interpolatedWindData.length > 0 && (
            <AxisRight
              left={xMax}
              scale={windYScale}
              numTicks={4}
              label="Wind (m/s)"
              labelProps={{
                fontSize: 12,
                textAnchor: "middle",
                fill: "#2563eb",
              }}
              tickLabelProps={() => ({
                fontSize: 10,
                textAnchor: "start",
                fill: "#2563eb",
                dx: 4,
              })}
              tickFormat={(d) => Math.round(Number(d)).toString()}
            />
          )}
        </Group>

        <PatternLines
          id={PATTERN_ID}
          height={8}
          width={8}
          stroke="#3b82f6"
          strokeWidth={1}
          orientation={["diagonal"]}
        />
        <LinearGradient
          id={GRADIENT_ID}
          from="#3b82f6"
          to="#3b82f6"
          toOpacity={0.4}
        />

        <Group
          left={brushMargin.left}
          top={topChartHeight + chartSeparation + brushMargin.top}
        >
          <AreaClosed<EnhancedPoint>
            data={lappedPoints}
            x={(d) => brushXScale(d.distance)}
            y={(d) => brushYScale(d.elevation ?? 0)}
            yScale={brushYScale}
            strokeWidth={1}
            stroke="#3b82f6"
            fill={`url(#${GRADIENT_ID})`}
            curve={curveMonotoneX}
          />

          <Brush
            xScale={brushXScale}
            yScale={brushYScale}
            width={xMax}
            height={brushHeight - brushMargin.top - brushMargin.bottom}
            margin={brushMargin}
            handleSize={8}
            innerRef={brushRef}
            resizeTriggerAreas={["left", "right"]}
            brushDirection="horizontal"
            initialBrushPosition={initialBrushPosition}
            onChange={onBrushChange}
            onClick={() => setFilteredData(null)}
            selectedBoxStyle={selectedBrushStyle}
            useWindowMoveEvents
          />
        </Group>
      </svg>

      {segmentStats && (
        <div className="absolute top-2 right-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-xs shadow-lg select-none pointer-events-auto">
          <div className="font-semibold mb-1 text-zinc-900 dark:text-zinc-100">
            Segment Stats
          </div>
          <div className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
            <div>
              Distance: {(segmentStats.totalDistance / 1000).toFixed(2)} km
            </div>
            <div>Gain: {Math.round(segmentStats.totalElevationGain)} m</div>
            <div>Loss: {Math.round(segmentStats.totalElevationLoss)} m</div>
          </div>
          <button
            onClick={() => {
              setFilteredData(null);
              setSegmentStats(null);
              if (brushRef.current) {
                brushRef.current.reset();
              }
            }}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline pointer-events-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {interpolatedWindData.length > 0 && !segmentStats && (
        <div className="absolute top-2 right-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs shadow-lg select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span className="text-zinc-600 dark:text-zinc-400">Wind</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-pink-400"></div>
              <span className="text-zinc-600 dark:text-zinc-400">Gust</span>
            </div>
          </div>
        </div>
      )}

      {tooltipData && (
        <TooltipWithBounds
          top={tooltipTop! - 50}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="space-y-1">
            <div className="font-semibold">
              {(tooltipData.distance / 1000).toFixed(2)} km
            </div>
            <div>Elevation: {Math.round(tooltipData.elevation ?? 0)} m</div>
            <div>Grade: {tooltipData.grade.toFixed(1)}%</div>
            {(() => {
              const wind = getWindAtDistance(tooltipData.distance);
              if (wind) {
                const timeLabel = wind.time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="font-semibold text-blue-400">
                      Wind <span className="text-gray-300">• {timeLabel}</span>
                    </div>
                    <div>Speed: {wind.windSpeed.toFixed(1)} m/s</div>
                    <div>Gust: {wind.windGust.toFixed(1)} m/s</div>
                  </div>
                );
              }
              return null;
            })()}
            {hoveredClimb && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="font-semibold text-yellow-400">Climb</div>
                <div>
                  Length: {(hoveredClimb.distance / 1000).toFixed(2)} km
                </div>
                <div>Elevation: {Math.round(hoveredClimb.elevationGain)} m</div>
                <div>Avg: {hoveredClimb.avgGrade.toFixed(1)}%</div>
                <div>Max: {hoveredClimb.maxGrade.toFixed(1)}%</div>
              </div>
            )}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}
