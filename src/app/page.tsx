import { TaskList } from "@/app/_components/task-list";

export default function HomePage() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-6 py-16">
			<header>
				<h1 className="font-semibold text-3xl tracking-tight">Tarefas</h1>
				<p className="mt-1 text-neutral-500 text-sm">
					Uma lista simples, servida pela API REST em{" "}
					<code className="rounded bg-neutral-200/60 px-1 py-0.5 text-xs">
						/api/tasks
					</code>
					.
				</p>
			</header>

			<TaskList />
		</main>
	);
}
