import { desc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";

/** Payload accepted when creating a task. Unknown keys are stripped by Zod. */
const createTaskSchema = z.object({
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(2000).optional(),
});

/** GET /api/tasks — returns every task, newest first. */
export async function GET() {
	const rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt));

	return NextResponse.json(rows);
}

/** POST /api/tasks — creates a task and returns it with its generated id. */
export async function POST(request: NextRequest) {
	const parsed = createTaskSchema.safeParse(
		await request.json().catch(() => null),
	);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", issues: z.treeifyError(parsed.error) },
			{ status: 400 },
		);
	}

	const [created] = await db.insert(tasks).values(parsed.data).returning();

	return NextResponse.json(created, { status: 201 });
}
