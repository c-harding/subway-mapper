export interface MapConfig {
  padding: number;
  spacing: {
    marker: number;
    label: number;
  };
  gap: {
    markerLabel: number;
  };
  lineWidth: number;
  marker: {
    radius: number;
    strokeWidth: number;
  };
  label: {
    fontSize: number;
    fontWeight: number;
  };
}
