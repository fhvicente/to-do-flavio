# PRD — To-Do

**Versão:** 1.0 · **Data:** 04/09/2026 · **Autor:** flavio.vicente@visual-thinking.pt

---

## 1. Contexto e problema

Precisamos de uma aplicação de gestão de tarefas mínima que sirva dois propósitos ao
mesmo tempo:

1. **Produto** — permitir a uma pessoa registar o que tem para fazer, marcar como
   concluído e apagar o que já não interessa.
2. **Referência técnica** — servir de base limpa e documentada para futuros projetos
   da equipa (Next.js + Postgres + API REST).

O segundo propósito é o que justifica o rigor da documentação num produto tão simples.

## 2. Objetivo

Entregar um gestor de tarefas com as quatro operações CRUD, exposto como **API REST**
e consumido por um **frontend próprio**, simples e cuidado.

### Fora de âmbito (v1)

Deliberadamente excluído — cada item pode ser acrescentado depois sem quebrar o
contrato da API:

| Excluído | Porquê |
| --- | --- |
| Autenticação / multi-utilizador | Não há requisito de partilha. Introduz sessões, permissões e um modelo de dados diferente. |
| Datas-limite, prioridades, etiquetas, projetos | Nenhum utilizador pediu. Cada campo é migração + validação + UI. |
| Paginação e pesquisa | Uma lista pessoal não passa de algumas centenas de linhas; `ORDER BY` chega. |
| Testes unitários por função | O contrato observável é a API. Um teste end-to-end cobre-o com menos código. |
| Soft delete / histórico | Não há requisito de recuperação. `DELETE` é definitivo. |

## 3. Utilizador-alvo

Uma pessoa, no seu próprio browser, sem necessidade de partilhar a lista.

## 4. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-1 | Criar uma tarefa com um título obrigatório (1–200 caracteres) e descrição opcional. |
| RF-2 | Listar todas as tarefas, da mais recente para a mais antiga. |
| RF-3 | Editar o título de uma tarefa existente. |
| RF-4 | Marcar/desmarcar uma tarefa como concluída. |
| RF-5 | Eliminar uma tarefa. |
| RF-6 | Ver quantas tarefas faltam concluir. |

## 5. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-1 | Todos os dados são validados no servidor antes de chegarem à base de dados. |
| RNF-2 | A API devolve códigos HTTP corretos (`201`, `200`, `204`, `400`, `404`). |
| RNF-3 | Erros da API são visíveis ao utilizador no frontend, nunca silenciosos. |
| RNF-4 | Interface acessível por teclado, com `aria-label` em todos os controlos sem texto. |
| RNF-5 | Código, nomes de variáveis, comentários e base de dados em inglês; documentação em pt-PT. |

## 6. Modelo de dados

Tabela única, `to-do-flavio_task`:

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | `integer`, identity | Chave primária. |
| `title` | `varchar(200)`, not null | O limite existe na base de dados **e** na validação. |
| `description` | `text`, nullable | Opcional por definição do produto. |
| `completed` | `boolean`, not null, default `false` | Ver justificação J-3. |
| `createdAt` | `timestamptz`, not null | Define a ordenação da lista. |
| `updatedAt` | `timestamptz`, nullable | Carimbo da última escrita, preenchido pelo ORM. |

Índice em `createdAt`, por ser o único padrão de leitura.

## 7. Contrato da API

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | — | `200` + lista de tarefas |
| `POST` | `/api/tasks` | `{ title, description? }` | `201` + tarefa criada |
| `PATCH` | `/api/tasks/:id` | `{ title?, description?, completed? }` | `200` + tarefa atualizada |
| `DELETE` | `/api/tasks/:id` | — | `204` sem corpo |

Erros: `400` para payload ou `id` inválidos (com o detalhe do Zod em `issues`),
`404` quando o `id` não existe.

## 8. Justificações das decisões

**J-1 — REST em vez de tRPC.**
O projeto arrancou de um template T3 que inclui tRPC. Foi removido: o pedido era uma
API, e uma API REST é consumível por qualquer cliente (curl, Postman, outra app),
enquanto o tRPC só é confortável a partir de TypeScript. Manter as duas camadas
significaria duas formas de fazer a mesma coisa. Removeram-se também as dependências
que só existiam para o tRPC (`@tanstack/react-query`, `superjson`, `server-only`).

**J-2 — Route Handlers do Next.js em vez de um servidor Express separado.**
O frontend já é Next.js. Um segundo processo traria outra porta, outro deploy e CORS,
sem trazer nada. Os *route handlers* são a funcionalidade nativa para isto.

**J-3 — `completed: boolean` em vez de um estado enumerado.**
O produto só tem dois estados. Um enum (`todo`/`doing`/`done`) seria especulação. A
mudança, caso venha a ser precisa, é uma migração — não uma reescrita.

**J-4 — Validação com Zod nas fronteiras.**
Os corpos dos pedidos vêm do exterior e não são de confiança. O Zod valida, faz
`trim` e descarta chaves desconhecidas num só passo, e já era dependência do projeto.
O `PATCH` rejeita um corpo vazio: é sempre um erro do cliente, não uma não-operação.

**J-5 — `useState` + `fetch` em vez de uma biblioteca de estado de servidor.**
Há um único recurso e um único ecrã. Depois de cada escrita a lista é recarregada por
inteiro — mais lento em teoria, imperceptível com esta dimensão, e elimina a classe de
bugs de cache dessincronizado. O ponto de mudança está assinalado no código com um
comentário `ponytail:`.

**J-6 — Um teste end-to-end em vez de uma suite unitária.**
O que pode partir é o contrato HTTP: códigos de estado, validação, persistência.
`tests/api.test.mjs` (runner nativo do Node, sem frameworks) exercita o ciclo CRUD
completo e os casos de erro. Testar os handlers isoladamente daria confiança sobre
código que já é trivial.

**J-7 — Drizzle + Postgres, mantidos do template.**
Já estavam configurados, com `start-database.sh` e migrações a funcionar. Trocar por
SQLite pouparia o Docker mas custaria uma reescrita, e Postgres é o que a equipa usa
em produção.

## 9. Critérios de aceitação

- [x] As quatro operações CRUD funcionam via API e via interface.
- [x] Um título vazio ou só com espaços é rejeitado com `400`.
- [x] Um `id` inexistente devolve `404`; um `id` não numérico devolve `400`.
- [x] `bun run typecheck` e `bun run check` passam sem erros.
- [x] `bun run test` passa com o servidor a correr.

## 10. Evolução possível

Por ordem de custo/benefício, quando houver necessidade real:

1. Autenticação (coluna `userId` + filtro nas queries).
2. Data-limite e ordenação por urgência.
3. Atualizações otimistas no frontend, se a latência incomodar.
4. Migrações versionadas (`db:generate` + `db:migrate`) em vez de `db:push`, antes do
   primeiro deploy em produção.
