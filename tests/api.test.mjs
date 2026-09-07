/**
 * End-to-end check of the CRUD contract. Requires the app running (`bun dev`).
 *
 * Run with: bun run test (needs the dev server up)
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/** Ids created by the tests, removed afterwards so reruns start clean. */
const createdIds = [];

function request(path, init) {
	return fetch(`${BASE_URL}${path}`, {
		...init,
		headers: init?.body ? { "Content-Type": "application/json" } : undefined,
	});
}

after(async () => {
	await Promise.all(
		createdIds.map((id) => request(`/api/tasks/${id}`, { method: "DELETE" })),
	);
});

test("creates, reads, updates and deletes a task", async () => {
	const createResponse = await request("/api/tasks", {
		method: "POST",
		body: JSON.stringify({
			title: "  Write the PRD  ",
			description: "For the to-do app",
		}),
	});
	assert.equal(createResponse.status, 201);

	const created = await createResponse.json();
	createdIds.push(created.id);
	assert.equal(created.title, "Write the PRD", "title should be trimmed");
	assert.equal(created.completed, false, "new tasks start incomplete");

	const list = await (await request("/api/tasks")).json();
	assert.ok(
		list.some((task) => task.id === created.id),
		"created task should appear in the list",
	);

	const updateResponse = await request(`/api/tasks/${created.id}`, {
		method: "PATCH",
		body: JSON.stringify({ completed: true, title: "Write the PRD v2" }),
	});
	assert.equal(updateResponse.status, 200);

	const updated = await updateResponse.json();
	assert.equal(updated.completed, true);
	assert.equal(updated.title, "Write the PRD v2");

	assert.equal(
		(await request(`/api/tasks/${created.id}`, { method: "DELETE" })).status,
		204,
	);
	assert.equal(
		(await request(`/api/tasks/${created.id}`, { method: "DELETE" })).status,
		404,
	);
	createdIds.pop();
});

test("rejects invalid payloads", async () => {
	const emptyTitle = await request("/api/tasks", {
		method: "POST",
		body: JSON.stringify({ title: "   " }),
	});
	assert.equal(emptyTitle.status, 400);

	const emptyPatch = await request("/api/tasks/1", {
		method: "PATCH",
		body: "{}",
	});
	assert.equal(
		emptyPatch.status,
		400,
		"a patch with no fields is a client error",
	);

	const badId = await request("/api/tasks/abc", { method: "DELETE" });
	assert.equal(badId.status, 400);
});
