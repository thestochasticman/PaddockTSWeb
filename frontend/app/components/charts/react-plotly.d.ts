declare module "react-plotly.js" {
  import type { ComponentType } from "react";
  interface PlotParams {
    data: Array<Record<string, unknown>>;
    layout?: Record<string, unknown>;
    config?: Record<string, unknown>;
    style?: React.CSSProperties;
    useResizeHandler?: boolean;
  }
  const Plot: ComponentType<PlotParams>;
  export default Plot;
}
