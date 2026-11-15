import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tacticalPlans } from "@/db/schema";
import { ApiError } from "./api-error";

const point = z.object({ name: z.string().trim().min(1).max(120),
  coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]) }).strict();
const plan = z.object({ regionId: z.enum(["arcadia", "ar", "gale", "jezero"]),
  pointA: point, pointB: point, speedKmH: z.number().min(0.36).max(5.4),
  distance: z.string().max(80) }).strict();

export async function handlePlanner(req: Request, path: string[]) {
  const db = getDb();
  if (path.length === 2 && path[1] === "plans") {
    if (req.method === "GET") {
      const rows = await db.select().from(tacticalPlans).orderBy(desc(tacticalPlans.createdAt)).limit(100);
      return Response.json({ items: rows.map(row => JSON.parse(row.payload)) });
    }
    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > 8000) throw new ApiError("INVALID_INPUT", "Plan is too large.", 400);
      let input: unknown;
      try { input = JSON.parse(text); } catch { throw new ApiError("INVALID_JSON", "Request must be valid JSON.", 400); }
      const data = plan.parse(input), id = crypto.randomUUID(), savedAt = new Date().toISOString();
      const record = { ...data, id, savedAt };
      await db.insert(tacticalPlans).values({ id, payload: JSON.stringify(record), createdAt: savedAt });
      return Response.json(record, { status: 201 });
    }
  }
  if (path.length === 3 && path[1] === "plans" && req.method === "DELETE") {
    await db.delete(tacticalPlans).where(eq(tacticalPlans.id, path[2]));
    return new Response(null, { status: 204 });
  }
  throw new ApiError("NOT_FOUND", "Planner endpoint not found.", 404);
}
