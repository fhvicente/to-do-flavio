"use client";

import { useCallback, useEffect, useState } from "react";

import type { Task } from "@/server/db/schema";

/**
 * Thin wrapper around the REST API. It throws on non-2xx so every caller can rely on
 * a single error path instead of checking `response.ok` in five places.
 */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: init?.body ? { "Content-Type": "application/json" } : undefined,
	});

	if (!response.ok) {
		throw new Error(
			`${init?.method ?? "GET"} ${url} failed (${response.status})`,
		);
	}

	// 204 No Content has an empty body, so parsing it would throw.
	return response.status === 204
		? (undefined as T)
		: ((await response.json()) as T);
}

export function TaskList() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [title, setTitle] = useState("");
	const [editing, setEditing] = useState<{ id: number; title: string } | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	/** Reloads the whole list. Cheap enough for a single-user to-do list. */
	// ponytail: refetch-all instead of local cache patching; swap for optimistic
	// updates only if the list grows past a few hundred tasks.
	const refresh = useCallback(async () => {
		try {
			setTasks(await api<Task[]>("/api/tasks"));
			setError(null);
		} catch (cause) {
			setError((cause as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	/** Runs a mutation and refreshes the list, surfacing any failure to the user. */
	async function mutate(run: () => Promise<unknown>) {
		try {
			await run();
			await refresh();
		} catch (cause) {
			setError((cause as Error).message);
		}
	}

	async function createTask(event: React.SubmitEvent) {
		event.preventDefault();

		const trimmed = title.trim();
		if (!trimmed) return;

		setTitle("");
		await mutate(() =>
			api("/api/tasks", {
				method: "POST",
				body: JSON.stringify({ title: trimmed }),
			}),
		);
	}

	function updateTask(
		id: number,
		patch: Partial<Pick<Task, "title" | "completed">>,
	) {
		return mutate(() =>
			api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
		);
	}

	function deleteTask(id: number) {
		return mutate(() => api(`/api/tasks/${id}`, { method: "DELETE" }));
	}

	async function saveEdit(event: React.SyntheticEvent) {
		event.preventDefault();
		if (!editing) return;

		const trimmed = editing.title.trim();
		const target = editing;
		setEditing(null);

		if (trimmed) await updateTask(target.id, { title: trimmed });
	}

	const remaining = tasks.filter((task) => !task.completed).length;

	return (
		<section className="flex flex-col gap-6">
			<form className="flex gap-2" onSubmit={createTask}>
				<input
					aria-label="Nova tarefa"
					className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
					maxLength={200}
					onChange={(event) => setTitle(event.target.value)}
					placeholder="O que precisa de ser feito?"
					value={title}
				/>
				<button
					className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
					disabled={!title.trim()}
					type="submit"
				>
					Adicionar
				</button>
			</form>

			{error && (
				<p
					className="rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm"
					role="alert"
				>
					{error}
				</p>
			)}

			<ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
				{loading && (
					<li className="px-4 py-6 text-neutral-400 text-sm">A carregar…</li>
				)}

				{!loading && tasks.length === 0 && (
					<li className="px-4 py-6 text-neutral-400 text-sm">
						Ainda não existem tarefas.
					</li>
				)}

				{tasks.map((task) => (
					<li className="group flex items-center gap-3 px-4 py-3" key={task.id}>
						<input
							aria-label={`Concluir ${task.title}`}
							checked={task.completed}
							className="size-4 shrink-0 accent-neutral-900 cursor-pointer"
							onChange={() =>
								updateTask(task.id, { completed: !task.completed })
							}
							type="checkbox"
						/>

						{editing?.id === task.id ? (
							<form className="flex-1" onSubmit={saveEdit}>
								<input
									// biome-ignore lint/a11y/noAutofocus: the input replaces the row the user just clicked
									autoFocus
									className="w-full border-neutral-300 border-b bg-transparent text-sm outline-none"
									maxLength={200}
									onBlur={saveEdit}
									onChange={(event) =>
										setEditing({ id: task.id, title: event.target.value })
									}
									value={editing.title}
								/>
							</form>
						) : (
							<button
								className={`flex-1 truncate text-left text-sm cursor-text ${
									task.completed ? "text-neutral-400 line-through cursor-pointer" : ""
								}`}
								onClick={() => setEditing({ id: task.id, title: task.title })}
								title="Clicar para editar"
								type="button"
							>
								{task.title}
							</button>
						)}

						<button
							aria-label={`Eliminar ${task.title}`}
							className="text-neutral-300 text-sm opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100 cursor-pointer"
							onClick={() => deleteTask(task.id)}
							type="button"
						>
							✕
						</button>
					</li>
				))}
			</ul>

			<p className="text-neutral-500 text-xs">
				{remaining} por concluir de {tasks.length}.
			</p>
		</section>
	);
}
