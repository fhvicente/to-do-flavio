# To-Do

Gestor de tarefas: uma API REST em Next.js sobre Postgres, mais um frontend clean.

O **[PRD](docs/PRD.md)** explica o âmbito, o que ficou deliberadamente de fora e a
justificação de cada decisão técnica.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| API | Route Handlers (`src/app/api/tasks`) |
| Base de dados | PostgreSQL + Drizzle ORM |
| Validação | Zod |
| Estilo | Tailwind CSS 4 |
| Qualidade | Biome, TypeScript, `node:test` |

## Arranque

```bash
bun install
./start-database.sh   # sobe o Postgres em Docker e escreve o DATABASE_URL no .env
bun run db:push       # cria a tabela de tarefas
bun run dev           # http://localhost:3000
```

## API

Base: `/api/tasks`

### `GET /api/tasks`

Lista todas as tarefas, da mais recente para a mais antiga.

```bash
curl localhost:3000/api/tasks
```

```json
[
  {
    "id": 1,
    "title": "Escrever o PRD",
    "description": null,
    "completed": false,
    "createdAt": "2026-09-04T09:12:00.000Z",
    "updatedAt": null
  }
]
```

### `POST /api/tasks`

Cria uma tarefa. `title` é obrigatório (1–200 caracteres, com `trim`);
`description` é opcional (até 2000 caracteres).

```bash
curl -X POST localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Escrever o PRD"}'
```

Devolve `201` com a tarefa criada.

### `PATCH /api/tasks/:id`

Atualização parcial. Aceita `title`, `description` e/ou `completed` — pelo menos um.

```bash
curl -X PATCH localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'
```

Devolve `200` com a tarefa atualizada.

### `DELETE /api/tasks/:id`

```bash
curl -X DELETE localhost:3000/api/tasks/1
```

Devolve `204` sem corpo.

### Erros

| Código | Quando |
| --- | --- |
| `400` | Payload inválido (detalhe do Zod em `issues`) ou `id` não numérico |
| `404` | O `id` não corresponde a nenhuma tarefa |

```json
{ "error": "Invalid payload", "issues": { "properties": { "title": { "errors": ["Too small"] } } } }
```

## Estrutura

```
src/
├── app/
│   ├── api/tasks/
│   │   ├── route.ts              # GET (listar) e POST (criar)
│   │   └── [id]/route.ts         # PATCH (atualizar) e DELETE (eliminar)
│   ├── _components/task-list.tsx # UI da lista (client component)
│   ├── layout.tsx
│   └── page.tsx
├── server/db/
│   ├── index.ts                  # ligação Drizzle
│   └── schema.ts                 # tabela `task`
└── styles/globals.css
docs/PRD.md                       # produto e justificações
tests/api.test.mjs                # teste end-to-end do CRUD
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun run typecheck` | TypeScript sem emitir |
| `bun run check` | Lint + formatação (Biome) |
| `bun run check:write` | Corrige o que for automático |
| `bun run test` | Teste end-to-end da API (**exige `bun run dev` a correr**) |
| `bun run db:push` | Sincroniza o schema com a base de dados |
| `bun run db:studio` | Interface visual da base de dados |
