# Relatório do processo

**Projeto:** to-do-flavio · **Data:** 05/09/2026 · **Autor:** Flávio Vicente

---

## 1. Ferramentas e modelos usados

| Ferramenta | Papel |
| --- | --- |
| **Claude Code (CLI)** com **Claude Opus 5** | Ferramenta principal. Ajudou com o desenvolvimento do schema, os *route handlers*, o componente de UI, os testes e a documentação, com acesso direto ao sistema de ficheiros e ao terminal. |
| **create-t3-app** (`ct3aMetadata.initVersion: 7.40.0`) | Scaffolding inicial: Next.js + Drizzle + Postgres + Biome + Tailwind. Não é IA, mas define o ponto de partida que a IA teve de limpar. |
| **Plugin `ponytail`** (skill do Claude Code) | Enquadramento de estilo imposto ao modelo: preferir a solução mais curta que funciona, biblioteca-padrão antes de dependências, marcar simplificações deliberadas com comentários `ponytail:`. |

Não usei Copilot, ChatGPT nem geradores de UI. Todo o código gerado passou por
`bun run typecheck`, `bun run check` (Biome) e `bun run test` antes de ser aceite.

---

## 2. Exemplos de prompts e resultados

### Prompt 1 — construção do núcleo

O prompt, na íntegra e como foi escrito (em inglês):

> Build a task manager inside an existing T3 Stack project (Next.js App Router,
> TypeScript, Drizzle ORM, Tailwind CSS). Expose task CRUD as a REST API via Next.js
> Route Handlers, and build a frontend that consumes it over HTTP (no tRPC for this
> feature).
>
> **Data model (Drizzle).** Add a `tasks` table: id, title (required), description
> (optional), status (TODO | IN_PROGRESS | DONE), priority (LOW | MEDIUM | HIGH),
> dueDate (optional), createdAt, updatedAt. Generate the migration. Use the existing db
> client from `~/server/db` — don't create a new connection.
>
> **REST API — `app/api/tasks/`.** POST /api/tasks, GET /api/tasks (filter by
> status/priority, pagination), GET /api/tasks/[id], PUT /api/tasks/[id],
> DELETE /api/tasks/[id]. Validate with Zod. Consistent JSON error shape. Correct
> status codes (201, 204, 400, 404).
>
> **Frontend.** React Query against these endpoints, Tailwind styling matching the
> starter. List view with filters, create/edit form, delete with confirmation. Loading,
> empty and error states.
>
> **PRD (em português europeu, pt-PT).** Documento curto: objetivo, âmbito, modelo de
> dados, contrato da API, principais decisões e justificação, riscos, próximos passos.
>
> **Output.** 1) PRD, 2) ficheiros a criar/alterar, 3) migração Drizzle, 4) route
> handlers, 5) componentes de frontend, 6) instruções para correr localmente. Código
> completo, sem placeholders. Onde for ambíguo, assume e regista a suposição.

**Resultado:** o modelo entregou de uma vez a tabela `task` em Drizzle, `GET`/`POST` em
`src/app/api/tasks/route.ts`, `PATCH`/`DELETE` em `src/app/api/tasks/[id]/route.ts`, o
componente `task-list.tsx`, `tests/api.test.mjs` e `docs/PRD.md` — o ciclo CRUD completo
e a funcionar. Entregou, porém, **menos do que o prompt pedia**, e justificou os cortes
no PRD como se fossem âmbito de produto e não desvios ao pedido:

| Pedido no prompt | O que saiu |
| --- | --- |
| `status` (TODO/IN_PROGRESS/DONE), `priority`, `dueDate` | apenas `completed: boolean` (justificado como J-3) |
| `Generate the migration` | sem pasta `drizzle/`; ficou o `db:push` |
| `GET` e `PUT` em `/api/tasks/[id]` | só `PATCH` e `DELETE`; sem `GET` por `id` |
| Filtro por status/prioridade e paginação | `GET /api/tasks` devolve a lista inteira (excluído na secção 2 do PRD) |
| React Query | `useState` + `fetch` (justificado como J-5) |
| Lista com filtros e `delete with confirmation` | sem filtros, e o `DELETE` dispara sem confirmação |

Um ponto merece nota à parte. O prompt dizia `no tRPC for this feature` — não usar tRPC
nesta funcionalidade. O modelo foi mais longe e **desinstalou o tRPC do template**,
levando com ele o `superjson`, o `server-only` e o `@tanstack/react-query` — que o
prompt pedia explicitamente. A decisão está registada como J-1 no PRD, com o argumento
de que manter tRPC e REST em paralelo seriam duas formas de fazer a mesma coisa. O
argumento é defensável; o problema é o PRD apresentá-lo como escolha de arquitetura sem
dizer que contraria um requisito escrito.

O prompt terminava com `Onde for ambíguo, assume e regista a suposição`. O modelo usou
essa margem para cortar requisitos que não eram ambíguos, e escreveu justificações
suficientemente convincentes para passarem numa leitura rápida. É o tipo de desvio que
só aparece a comparar o prompt com o resultado, linha por linha — e a razão pela qual
nada disto pode ser assinado de cruz.

### Prompt 2 — output do build colado em bruto

> [colagem do output de `bun run build` e `bun run typecheck`]

**Resultado:** o modelo separou o ruído do erro real. A maior parte do output era o Next 16
a ajustar o `tsconfig.json` (mensagem informativa, não erro). O erro verdadeiro era um só:

```
tsconfig.json(33,5): error TS5102: Option 'baseUrl' has been removed.
```

O TypeScript 7 removeu a opção `baseUrl`. A correção foi remover a linha — os `paths` já
são resolvidos relativamente ao próprio `tsconfig.json`, por isso `@/*` → `./src/*`
continuou a funcionar. Confirmado com `typecheck` limpo e `build` a gerar as 3 rotas.

---

## 3. O que aceitei tal como veio, e o que corrigi

### Aceite sem alterações

- **Validação com Zod nas fronteiras** (`createTaskSchema`, `updateTaskSchema`). Faz
  `trim`, impõe limites e descarta chaves desconhecidas num só passo. O `.refine()` que
  rejeita um `PATCH` de corpo vazio foi iniciativa do modelo e está certo: um corpo vazio
  é erro do cliente, não uma não-operação.
- **`parseId()` partilhada** entre `PATCH` e `DELETE`, em vez de repetir a validação em
  cada *handler*.
- **Uso de `.returning()` para detetar o 404** em vez de fazer um `SELECT` antes do
  `UPDATE`/`DELETE`. Uma ida à base de dados em vez de duas, sem condição de corrida.
- **Índice em `createdAt`** — corresponde ao único padrão de leitura que existe.
- **Um teste end-to-end com o runner nativo do Node** (`node --test`), sem frameworks.

### Corrigido ou rejeitado

| O quê | Motivo |
| --- | --- |
| `baseUrl` no `tsconfig.json` (herdado do template, mantido pela IA) | Removido pelo TypeScript 7. A IA só o detetou depois de eu correr o `typecheck` — não antecipou. |
| Atualizações otimistas no frontend | Não pedidas, e a IA propôs-se fazê-las. Ficaram de fora e o ponto de mudança está assinalado no código com um comentário `ponytail:` em `task-list.tsx:39`. |

---