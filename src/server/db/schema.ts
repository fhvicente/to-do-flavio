import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Prefixes every table with the project name, so a single Postgres instance can host
 * several projects without name collisions.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `to-do-flavio_${name}`);

/**
 * The single domain table of the application.
 *
 * `completed` is a boolean instead of a status enum: the product only ever has two
 * states. An enum can be introduced later without breaking the API contract.
 */
export const tasks = createTable(
	"task",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		title: d.varchar({ length: 200 }).notNull(),
		description: d.text(),
		completed: d.boolean().notNull().default(false),
		createdAt: d
			.timestamp({ withTimezone: true })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	// The list is always sorted by creation date, so the index matches the only read pattern.
	(t) => [index("task_created_at_idx").on(t.createdAt)],
);

export type Task = typeof tasks.$inferSelect;
