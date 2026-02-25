export type PlotGroupConfig = {
  vars: string[];
  ylabel: string;
  title: string;
  kind?: "line" | "bar";
  colors?: string[];
};

export const SILO_GROUPS: Record<string, PlotGroupConfig> = {
  temperature: {
    vars: ["max_temp", "min_temp"],
    ylabel: "Temperature (\u00B0C)",
    title: "Daily Temperature",
    colors: ["#e44", "#48f"],
  },
  rainfall: {
    vars: ["daily_rain"],
    ylabel: "Rainfall (mm)",
    title: "Monthly Rainfall",
    kind: "bar",
    colors: ["#48f"],
  },
  radiation: {
    vars: ["radiation"],
    ylabel: "Radiation (MJ/m\u00B2)",
    title: "Solar Radiation",
    colors: ["#f90"],
  },
  evapotranspiration: {
    vars: ["et_short_crop", "evap_pan"],
    ylabel: "ET (mm)",
    title: "Evapotranspiration",
    colors: ["#5b4", "#2a8"],
  },
  humidity: {
    vars: ["vp_deficit", "vp"],
    ylabel: "hPa",
    title: "Vapour Pressure",
    colors: ["#9ae", "#6cf"],
  },
};

export const OZWALD_DAILY_GROUPS: Record<string, PlotGroupConfig> = {
  temperature: {
    vars: ["Tmax", "Tmin"],
    ylabel: "Temperature (\u00B0C)",
    title: "OzWALD Daily Temperature",
    colors: ["#e44", "#48f"],
  },
  precipitation: {
    vars: ["Pg"],
    ylabel: "Precipitation (mm)",
    title: "OzWALD Monthly Precipitation",
    kind: "bar",
    colors: ["#48f"],
  },
  wind: {
    vars: ["Uavg", "Ueff"],
    ylabel: "Wind Speed (m/s)",
    title: "OzWALD Wind Speed",
    colors: ["#7bc", "#4a9"],
  },
  radiation: {
    vars: ["DWLReff"],
    ylabel: "Radiation (W/m\u00B2)",
    title: "OzWALD Downwelling Longwave Radiation",
    colors: ["#f90"],
  },
};
