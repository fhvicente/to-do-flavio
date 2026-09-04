import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";

/**
 * Payload accepted when updating a task. Every field is optional (partial update),
 * but at least one must be present — an empty body is a client mistake, not a no-op.
 */
const updateTaskSchema = z
	.object({
		title: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		completed: z.boolean().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

/** Route params are async in Next.js 15+. */
type RouteContext = { params: Promise<{ id: string }> };

/** Parses the `id` segment; returns null when it is not a positive integer. */
function parseId(id: string) {
	const parsed = z.coerce.number().int().positive().safeParse(id);

	return parsed.success ? parsed.data : null;
}

/** PATCH /api/tasks/:id — partially updates a task. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
	const id = parseId((await params).id);

	if (id === null) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", issues: z.treeifyError(parsed.error) },
			{ status: 400 },
		);
	}

	const [updated] = await db
		.update(tasks)
		.set(parsed.data)
		.where(eq(tasks.id, id))
		.returning();

	if (!updated) {
		return NextResponse.json({ error: "Task not found" }, { status: 404 });
	}

	return NextResponse.json(updated);
}

/** DELETE /api/tasks/:id — removes a task. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
	const id = parseId((await params).id);

	if (id === null) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	const [deleted] = await db
		.delete(tasks)
		.where(eq(tasks.id, id))
		.returning({ id: tasks.id });

	if (!deleted) {
		return NextResponse.json({ error: "Task not found" }, { status: 404 });
	}

	return new NextResponse(null, { status: 204 });
}
