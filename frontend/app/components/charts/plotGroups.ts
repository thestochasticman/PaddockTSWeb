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
    title: "Daily Rainfall",
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
    vars: ["et_short_crop"],
    ylabel: "ET (mm)",
    title: "Evapotranspiration",
    colors: ["#c84"],
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
    title: "OzWALD Daily Precipitation",
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

// OzWALD 8-day variables (Ssoil = root-zone soil moisture, LAI, GPP, NDVI, etc.).
// One observation every 8 days; we render as a line.
export const OZWALD_8DAY_GROUPS: Record<string, PlotGroupConfig> = {
  soil_moisture: {
    vars: ["Ssoil"],
    ylabel: "Soil moisture (mm)",
    title: "OzWALD Soil Moisture",
    colors: ["#6a9"],
  },
  vegetation_index: {
    vars: ["NDVI", "EVI"],
    ylabel: "Index",
    title: "OzWALD NDVI / EVI",
    colors: ["#6a2", "#9c3"],
  },
  lai: {
    vars: ["LAI"],
    ylabel: "LAI",
    title: "OzWALD Leaf Area Index",
    colors: ["#3a8"],
  },
  gpp: {
    vars: ["GPP"],
    ylabel: "GPP (gC/m\u00B2/day)",
    title: "OzWALD Gross Primary Production",
    colors: ["#6c2"],
  },
};
