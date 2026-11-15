import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { missions, routes } from "@/db/schema";
import {
  REGION,
  SITES,
  HOME,
  toLonLat,
  fromLonLat,
  inside,
  elevation,
  slope,
  geologyAt,
  GRID,
  DATA_VERSION,
} from "./terrain";
import { calculateRoute, ApiError } from "./routing";
import datasets from "@/data/processed/datasets.json";
import imageAtlas from "@/public/data/arcadia-images.json";
import { routeCsv, missionBrief } from "./exports";
import { climateReport } from "./climate";
import { terrainModel } from "./terrain-model";
import { regionalManifest, regionalTerrainModel } from "./regional";
import { calculateDirections } from "./directions";
import { hazardCatalog, resourceCatalog, identifyPoint } from "./intelligence";
import { arCatalog, handleAr } from "./ar";
import { handlePlanner } from "./planner";
import { unifiedArcadia } from "./unified";
import {jezeroInfo,identifyJezero} from './jezero';
const input = z
  .object({
    name: z.string().trim().min(1).max(80),
    notes: z.string().max(3000).optional(),
    crew_count: z.number().int().min(1).max(4).optional(),
    equipment: z.string().trim().max(500).optional(),
    model_local_hour: z.number().int().min(0).max(24).optional(),
    observation_tasks: z
      .array(
        z
          .object({
            site_id: z.enum(["terrace", "plains", "rim"]),
            objective: z.string().trim().min(1).max(500),
            dwell_time_s: z.number().int().min(60).max(3600),
          })
          .strict(),
      )
      .max(3)
      .refine(
        (tasks) => new Set(tasks.map((t) => t.site_id)).size === tasks.length,
        "Observation tasks must be unique",
      )
      .optional(),
    site_ids: z
      .array(z.enum(["terrace", "plains", "rim"]))
      .min(1)
      .max(3)
      .refine(
        (v) => new Set(v).size === v.length,
        "Destinations must be unique",
      ),
    return_to_start: z.boolean().default(true),
    constraints: z
      .object({
        max_slope_deg: z.number().min(1).max(35),
        max_distance_m: z.number().min(100).max(30000),
        max_duration_s: z.number().min(600).max(43200),
        walking_speed_m_s: z.number().min(0.1).max(1.5),
      })
      .strict(),
  })
  .strict();
const json = (x: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(x, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
async function body(req: Request) {
  const text = await req.text();
  if (text.length > 16000)
    throw new ApiError("INVALID_INPUT", "Request is too large.", 400);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("INVALID_JSON", "Request must be valid JSON.", 400);
  }
}
export async function handleApi(req: Request) {
  try {
    const url = new URL(req.url),
      p = url.pathname
        .replace(/^\/api\/v1\/?/, "")
        .split("/")
        .filter(Boolean),
      method = req.method;
    if(method === 'GET' && p.length === 1 && p[0] === 'arcadia') return json(unifiedArcadia);
    if(method === 'GET' && p.length === 1 && p[0] === 'jezero') return json(jezeroInfo);
    if (p[0] === "planner") return await handlePlanner(req, p);
    if (method === "GET") {
      const arResponse = handleAr(p, url);
      if (arResponse) return arResponse;
      if (p[0] === "regions" && p.length === 1)
        return json({ items: [{ ...REGION, start: toLonLat(HOME) }, arCatalog.region] });
    }
    if (method === "GET" && p.length === 1 && p[0] === "hazards")
      return json(hazardCatalog);
    if (method === "GET" && p.length === 1 && p[0] === "resources")
      return json(resourceCatalog);
    if (method === "GET" && p.length === 1 && p[0] === "identify") {
      if (!url.searchParams.has("lon") || !url.searchParams.has("lat"))
        throw new ApiError(
          "INVALID_POINT",
          "Longitude and latitude are required.",
        );
      const coordinate = z
        .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
        .parse([
          Number(url.searchParams.get("lon")),
          Number(url.searchParams.get("lat")),
        ]);
      return json(url.searchParams.get('region')==='jezero'?identifyJezero(coordinate):identifyPoint(coordinate));
    }
    if (method === "POST" && p[0] === "directions" && p.length === 1) {
      const coordinate = z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]);
      const data = z
        .object({
          start: coordinate,
          region: z.enum(['arcadia','jezero']).default('arcadia'),
          objective: z.enum(['balanced','shortest','gentlest']).default('balanced'),
          end: coordinate,
          max_slope_deg: z.number().min(1).max(35).default(18),
          walking_speed_m_s: z.number().min(0.1).max(1.5).default(0.5),
          resolution: z.enum(["auto", "regional", "detail"]).default("auto"),
        })
        .strict()
        .parse(await body(req));
      return json(calculateDirections(data));
    }
    if (method === "GET" && p[0] === "regional") {
      if (!p[1]) return json(regionalManifest);
      if (p[1] === "terrain-model")
        return json(regionalTerrainModel(), 200, {
          "Cache-Control": "public, max-age=3600",
        });
      throw new ApiError("NOT_FOUND", "Regional endpoint not found.", 404);
    }
    if (method === "GET" && p[0] === "health")
      return json({
        status: "ok",
        app: "arcadia",
        mode: "nasa_mission_data",
        data_version: DATA_VERSION,
      });
    if (method === "GET" && p[0] === "ready") {
      await getDb().select({ id: missions.id }).from(missions).limit(1);
      return json({
        status: "ready",
        database: "available",
        data_version: DATA_VERSION,
        terrain_cells: GRID.elevations.length,
      });
    }
    if (method === "GET" && p[0] === "regions") {
      if (p[1] && p[1] !== REGION.id)
        throw new ApiError("NOT_FOUND", "Region not found.", 404);
      if (p[2] === "climate") return json(climateReport());
      if (p[2] === "terrain-model")
        return json(terrainModel(), 200, {
          "Cache-Control": "public, max-age=3600",
        });
      if (p[2] === "sites")
        return json({
          items: SITES.map((s) => ({
            ...s,
            coordinate: s.coordinate,
            routing_coordinate: toLonLat(s.point),
            synthetic: false,
          })),
        });
      if (p[2] === "geology")
        return json({
          items: GRID.geology,
          available: false,
          reason:
            "No verified local geologic map is loaded for this Arcadia sector.",
          context_only: true,
        });
      if (p[2] === "traverse")
        return json({
          items: [],
          available: false,
          reason: "No rover traverse is available for Arcadia Planitia.",
          source_url: "https://planetarynames.wr.usgs.gov/Feature/348",
          retrieved_at: GRID.retrieved_at,
          live: false,
        });
      if (p[2] === "layers")
        return json({
          items: [
            { id: "imagery", name: "HiRISE orthophoto", data_type: "optical" },
            {
              id: "terrain",
              name: "Measured relief",
              data_type: "topographic",
            },
            {
              id: "slope",
              name: "DEM-derived slope",
              data_type: "topographic",
            },
            {
              id: "thermal",
              name: "THEMIS nighttime infrared",
              data_type: "thermal_infrared",
            },
          ].map((l) => ({
            ...l,
            synthetic: false,
            data_version: DATA_VERSION,
          })),
        });
      if (p[2] === "surface") {
        const lon = Number(url.searchParams.get("lon")),
          lat = Number(url.searchParams.get("lat"));
        if (
          !url.searchParams.has("lon") ||
          !url.searchParams.has("lat") ||
          !Number.isFinite(lon) ||
          !Number.isFinite(lat) ||
          lon < -180 ||
          lon > 180 ||
          lat < -90 ||
          lat > 90
        )
          throw new ApiError(
            "INVALID_POINT",
            "Valid lon and lat are required.",
          );
        const pt = fromLonLat([lon, lat]);
        if (!inside(pt))
          throw new ApiError(
            "OUTSIDE_COVERAGE",
            "Point is outside the prepared HiRISE sector.",
          );
        if (!Number.isFinite(elevation(...pt)))
          throw new ApiError(
            "NO_DATA",
            "No valid HiRISE elevation is available at this point.",
          );
        return json({
          coordinate: toLonLat(pt),
          requested_coordinate: [lon, lat],
          elevation_m: elevation(...pt),
          slope_deg: slope(...pt),
          geology: geologyAt(pt),
          source_dataset_id: GRID.dtm_id,
          analysis_grid_m: 20,
          vertical_reference: GRID.vertical_reference,
          synthetic: false,
        });
      }
      if (p.length > 2)
        throw new ApiError("NOT_FOUND", "Endpoint not found.", 404);
      return json(
        p[1] ? { ...REGION, start: toLonLat(HOME) } : { items: [REGION] },
      );
    }
    if (method === "GET" && p[0] === "datasets") {
      if (!p[1]) {
        const items = [...datasets.items.map(item => ({ ...item, region_id: REGION.id })), ...arCatalog.datasets].filter(item =>
          (!url.searchParams.has("region_id") || item.region_id === url.searchParams.get("region_id")) &&
          (!url.searchParams.has("data_type") || item.data_type === url.searchParams.get("data_type")));
        return json({ ...datasets, items });
      }
      const arRecord = arCatalog.datasets.find(d => d.id === p[1]);
      if (arRecord) return json(arRecord);
      const record = datasets.items.find((d) => d.id === p[1]);
      if (!record) throw new ApiError("NOT_FOUND", "Dataset not found.", 404);
      return json({ ...record, retrieved_at: datasets.retrieved_at });
    }
    if (method === "GET" && p[0] === "images") {
      if (!p[1]) return json(imageAtlas);
      const photo = imageAtlas.items.find((item) => item.id === p[1]);
      if (!photo) throw new ApiError("NOT_FOUND", "Image view not found.", 404);
      return json(photo);
    }
    if (p[0] === "missions") {
      const db = getDb();
      if (p.length === 1 && method === "GET") {
        const items = await db
          .select()
          .from(missions)
          .orderBy(desc(missions.createdAt))
          .limit(50);
        return json({ items: items.map((v) => JSON.parse(v.payload)) });
      }
      if (p.length === 1 && method === "POST") {
        const data = input.parse(await body(req));
        const id = crypto.randomUUID(),
          now = new Date().toISOString();
        const record = {
          ...data,
          id,
          revision: 1,
          region_id: REGION.id,
          data_version: DATA_VERSION,
          created_at: now,
        };
        await db
          .insert(missions)
          .values({ id, payload: JSON.stringify(record), createdAt: now });
        return json(record, 201, { Location: "/api/v1/missions/" + id });
      }
      const row = (
        await db.select().from(missions).where(eq(missions.id, p[1])).limit(1)
      )[0];
      if (!row) throw new ApiError("NOT_FOUND", "Mission not found.", 404);
      const mission = JSON.parse(row.payload);
      if (p.length === 2 && method === "GET") return json(mission);
      if (p.length === 2 && method === "DELETE") {
        await db.delete(missions).where(eq(missions.id, p[1]));
        return new Response(null, { status: 204 });
      }
      if (p.length === 3 && p[2] === "routes") {
        if (method === "GET") {
          const records = await db
            .select()
            .from(routes)
            .where(eq(routes.missionId, p[1]));
          return json({
            items: records
              .map((r) => JSON.parse(r.payload))
              .sort((a, b) => a.created_at.localeCompare(b.created_at)),
          });
        }
        if (method === "POST") {
          if (mission.data_version !== DATA_VERSION)
            throw new ApiError(
              "LEGACY_MISSION",
              "This mission uses another region or an older dataset. Create an Arcadia Planitia mission.",
              409,
            );
          const route = {
            ...calculateRoute(mission),
            mission_snapshot: mission,
            provenance: datasets,
            mission_id: mission.id,
            mission_revision: mission.revision,
            created_at: new Date().toISOString(),
          };
          await db.insert(routes).values({
            id: route.id,
            missionId: mission.id,
            payload: JSON.stringify(route),
          });
          return json(route, 201);
        }
      }
    }
    if (p[0] === "routes" && p[1] && method === "GET") {
      const row = (
        await getDb().select().from(routes).where(eq(routes.id, p[1])).limit(1)
      )[0];
      if (!row) throw new ApiError("NOT_FOUND", "Route not found.", 404);
      const r = JSON.parse(row.payload);
      if (p.length === 2) return json(r);
      if (p[2] === "profile") return json({ items: r.profile });
      if (p[2] === "export") {
        const format = url.searchParams.get("format");
        if (
          (format === "csv" || format === "brief") &&
          r.data_version !== DATA_VERSION
        )
          throw new ApiError(
            "LEGACY_ROUTE",
            "This route uses another region or an older dataset. Export its original JSON or compute a current Arcadia route.",
            409,
          );
        if (format === "csv")
          return new Response(routeCsv(r), {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition":
                'attachment; filename="arcadia-traverse.csv"',
              "Cache-Control": "no-store",
            },
          });
        if (format === "brief")
          return new Response(missionBrief(r), {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          });
        if (url.searchParams.get("format") !== "json")
          throw new ApiError(
            "INVALID_FORMAT",
            "Choose json, csv or brief export.",
            400,
          );
        return json(r, 200, {
          "Content-Disposition": 'attachment; filename="arcadia-route.json"',
        });
      }
    }
    throw new ApiError("NOT_FOUND", "Endpoint or method not supported.", 404);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json(
        {
          error: {
            code: "INVALID_INPUT",
            message: e.issues.map((x) => x.message).join("; "),
          },
        },
        422,
      );
    if (e instanceof ApiError)
      return json({ error: { code: e.code, message: e.message } }, e.status);
    console.error(e);
    return json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Mission storage is unavailable. Please try again.",
        },
      },
      503,
    );
  }
}
