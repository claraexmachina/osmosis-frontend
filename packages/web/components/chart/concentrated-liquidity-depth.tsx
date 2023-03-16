import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import {
  AnimatedBarSeries,
  AnimatedGrid,
  Annotation,
  AnnotationCircleSubject,
  AnnotationConnector,
  AnnotationLineSubject,
  buildChartTheme,
  XYChart,
} from "@visx/xychart";
import { FunctionComponent } from "react";

import { theme } from "~/tailwind.config";

export type DepthData = {
  tick: number;
  depth: number;
};

// TODO: Update component to support horizontal=false
const ConcentratedLiquidityDepthChart: FunctionComponent<{
  min: number;
  max: number;
  yRange: [number, number];
  xRange: [number, number];
  data: DepthData[];
  annotationDatum?: DepthData;
  onMoveMax?: (value: number) => void;
  onMoveMin?: (value: number) => void;
  onSubmitMax?: (value: number) => void;
  onSubmitMin?: (value: number) => void;
  offset?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  horizontal?: boolean;
}> = ({
  data,
  min,
  max,
  yRange,
  xRange,
  annotationDatum,
  onMoveMin,
  onMoveMax,
  onSubmitMin,
  onSubmitMax,
  offset,
  horizontal = true,
}) => {
  const xMax = xRange[1];
  const showMinDragHandler = !!onMoveMin && !!onSubmitMin;
  const showMaxDragHandler = !!onMoveMax && !!onSubmitMax;

  const { top = 0, right = 0, bottom = 0, left = 0 } = offset || {};

  return (
    <ParentSize className="flex-shrink-1 flex-1 overflow-hidden">
      {({ height, width }) => {
        const yScale = scaleLinear({
          range: [top, height - bottom],
          domain: yRange.slice().reverse(),
          zero: false,
        });

        return (
          <XYChart
            key="bar-chart"
            captureEvents={false}
            margin={{ top, right, bottom, left }}
            height={height}
            width={width}
            xScale={{
              type: "linear",
              domain: xRange,
            }}
            yScale={{
              type: "linear",
              domain: yRange,
              zero: false,
            }}
            theme={buildChartTheme({
              backgroundColor: "transparent",
              colors: ["white"],
              gridColor: theme.colors.osmoverse["600"],
              gridColorDark: theme.colors.osmoverse["300"],
              svgLabelSmall: {
                fill: theme.colors.osmoverse["300"],
                fontSize: 12,
                fontWeight: 500,
              },
              svgLabelBig: {
                fill: theme.colors.osmoverse["300"],
                fontSize: 12,
                fontWeight: 500,
              },
              tickLength: 1,
              xAxisLineStyles: {
                strokeWidth: 0,
              },
              xTickLineStyles: {
                strokeWidth: 0,
              },
              yAxisLineStyles: {
                strokeWidth: 0,
              },
            })}
            horizontal={horizontal}
          >
            {/* Uncomment when testing alignment */}
            {/*<AnimatedAxis*/}
            {/*  orientation="right"*/}
            {/*  numTicks={5}*/}
            {/*  strokeWidth={0}*/}
            {/*/>*/}
            <AnimatedGrid columns={false} rows={false} numTicks={5} />
            <AnimatedBarSeries
              dataKey="depth"
              data={data}
              xAccessor={(d: DepthData) => d?.depth}
              yAccessor={(d: DepthData) => d?.tick}
              colorAccessor={() => theme.colors.barFill}
            />
            {annotationDatum && (
              <Annotation
                dataKey="depth"
                xAccessor={(d: DepthData) => d.depth}
                yAccessor={(d: DepthData) => d.tick}
                datum={annotationDatum}
              >
                <AnnotationConnector />
                <AnnotationCircleSubject
                  stroke={theme.colors.wosmongton["200"]}
                  // @ts-ignore
                  strokeWidth={4}
                  radius={2}
                />
                <AnnotationLineSubject
                  orientation="horizontal"
                  stroke={theme.colors.wosmongton["200"]}
                  strokeWidth={3}
                />
              </Annotation>
            )}
            {showMaxDragHandler && (
              <DragContainer
                defaultValue={max}
                length={xMax}
                scale={yScale}
                stroke={theme.colors.wosmongton["500"]}
                onMove={onMoveMax}
                onSubmit={onSubmitMax}
              />
            )}
            {showMinDragHandler && (
              <DragContainer
                defaultValue={min}
                length={xMax}
                scale={yScale}
                stroke={theme.colors.bullish["500"]}
                onMove={onMoveMin}
                onSubmit={onSubmitMin}
              />
            )}
            <style>{`
              .visx-bar {
                stroke: ${theme.colors.barFill};
                stroke-width: 3px;
              }
            `}</style>
          </XYChart>
        );
      }}
    </ParentSize>
  );
};

function DragContainer(props: {
  defaultValue?: number;
  length?: number;
  scale: any;
  onMove?: (value: number) => void;
  onSubmit?: (value: number) => void;
  stroke: string;
}) {
  return (
    <Annotation
      dataKey="depth"
      xAccessor={(d: any) => d?.depth}
      yAccessor={(d: any) => d?.tick}
      datum={{ tick: props.defaultValue, depth: props.length }}
      canEditSubject
      canEditLabel={false}
      onDragMove={({ event, ...nextPos }) => {
        if (props.onMove) {
          const val = props.scale.invert(nextPos.y);
          props.onMove(+Math.max(0, val));
        }
      }}
      onDragEnd={({ event, ...nextPos }) => {
        if (props.onSubmit) {
          const val = props.scale.invert(nextPos.y);
          props.onSubmit(+Math.max(0, val));
        }
      }}
      editable
    >
      <AnnotationConnector />
      <AnnotationCircleSubject
        stroke={props.stroke}
        // @ts-ignore
        strokeWidth={8}
        radius={2}
      />
      <AnnotationLineSubject
        orientation="horizontal"
        stroke={props.stroke}
        strokeWidth={3}
      />
    </Annotation>
  );
}

export default ConcentratedLiquidityDepthChart;
