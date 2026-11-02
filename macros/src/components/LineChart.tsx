import { useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';

export interface Series {
  points: { x: number; y: number }[];
  color: string;
  /** Draw as dots instead of a line (e.g. raw scale weights). */
  dots?: boolean;
  width?: number;
}

// SVG text on web otherwise falls back to the browser's serif default.
const LABEL_FONT = Platform.select({ web: 'system-ui, -apple-system, sans-serif', default: undefined });

/** Minimal dependency-free line chart; x values are day indexes. */
export function LineChart({
  series,
  height = 160,
  formatY = (v) => v.toFixed(0),
  axis = true,
  testID,
}: {
  series: Series[];
  height?: number;
  formatY?: (v: number) => string;
  /** Draw gridlines and y-axis labels; off for sparklines. */
  axis?: boolean;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.points);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (all.length === 0) return <View style={{ height }} onLayout={onLayout} testID={testID} />;

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  let [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const pad = Math.max((maxY - minY) * 0.15, Math.abs(maxY) * 0.005, 0.5);
  minY -= pad;
  maxY += pad;

  const left = 4;
  const right = axis ? 40 : 4;
  const top = 8;
  const bottom = 8;
  const w = Math.max(1, width - left - right);
  const h = height - top - bottom;
  const sx = (x: number) => left + (maxX === minX ? w / 2 : ((x - minX) / (maxX - minX)) * w);
  const sy = (y: number) => top + (1 - (y - minY) / (maxY - minY)) * h;
  const gridYs = [maxY - pad, (maxY + minY) / 2, minY + pad];

  return (
    <View style={{ height }} onLayout={onLayout} testID={testID}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {axis &&
            gridYs.map((gy, i) => (
              <Line key={i} x1={left} x2={left + w} y1={sy(gy)} y2={sy(gy)} stroke={colors.border} strokeDasharray="3 4" strokeWidth={1} />
            ))}
          {axis &&
            gridYs.map((gy, i) => (
              <SvgText key={`t${i}`} x={left + w + 6} y={sy(gy) + 4} fill={colors.textDim} fontSize={11} fontFamily={LABEL_FONT}>
                {formatY(gy)}
              </SvgText>
            ))}
          {series.map((s, i) =>
            s.dots ? (
              s.points.map((p, j) => <Circle key={`${i}-${j}`} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={s.color} opacity={0.55} />)
            ) : (
              <Path
                key={i}
                d={s.points.map((p, j) => `${j === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}
                stroke={s.color}
                strokeWidth={s.width ?? 2.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ),
          )}
        </Svg>
      )}
    </View>
  );
}
