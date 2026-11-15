import source from "@/data/processed/climate.json";
import extras from "@/data/processed/climate-extras.json";
export function relativeHumidityIce(
  temperatureK: number,
  pressurePa: number,
  waterVaporVmr: number,
) {
  if (
    !Number.isFinite(temperatureK) ||
    temperatureK <= 110 ||
    !Number.isFinite(pressurePa) ||
    pressurePa <= 0 ||
    !Number.isFinite(waterVaporVmr) ||
    waterVaporVmr < 0 ||
    waterVaporVmr > 1
  )
    throw new Error("Invalid climate inputs");
  const saturationPa = Math.exp(
    9.550426 -
      5723.265 / temperatureK +
      3.53068 * Math.log(temperatureK) -
      0.00728332 * temperatureK,
  );
  return (100 * pressurePa * waterVaporVmr) / saturationPa;
}
export function climateReport() {
  return {
    ...source,
    extras_provenance: {
      request_url: extras.request_url,
      source_sha256: extras.source_sha256,
      retrieved_at: extras.retrieved_at,
    },
    precipitation: {
      rainfall_mm_h: null,
      snowfall_mm_h: null,
      status: "unavailable",
      live: false,
      note: "No local precipitation rate or forecast is loaded. Modern Martian water deposition may involve frost or snow; do not interpret unavailable as zero.",
      source_url: "https://www.nasa.gov/general/water-cycle/",
    },
    radiation: {
      dose_rate_msv_h: null,
      status: "unavailable",
      note: "No local radiation monitoring feed is loaded.",
    },
    humidity_reference: "ice",
    humidity_method:
      "100 × pressure × H2O volume mixing ratio / ice saturation vapor pressure; Murphy & Koop (2005), T > 110 K. Supersaturation is preserved.",
    humidity_method_url: "https://doi.org/10.1256/qj.04.94",
    samples: source.samples.map((s) => ({
      ...s,
      ...extras.samples.find((e) => e.local_hour === s.local_hour)!,
      air_temperature_c: s.air_temperature_k - 273.15,
      surface_temperature_c: s.surface_temperature_k - 273.15,
      relative_humidity_ice_percent: relativeHumidityIce(
        s.air_temperature_k,
        s.pressure_pa,
        s.water_vapor_vmr,
      ),
    })),
  };
}
