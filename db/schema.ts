import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const missions = sqliteTable("missions", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
export const routes = sqliteTable("routes", {
  id: text("id").primaryKey(),
  missionId: text("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
});
