# GEMINI.md — Адаптер для Gemini CLI и AI Studio

Единый источник правил этого репозитория находится в [`AGENTS.md`](./AGENTS.md).
Не дублируйте правила здесь — все общие требования, инварианты и команды проверки поддерживаются централизованно в `AGENTS.md` и `docs/agent/`.

@AGENTS.md

## Порядок действий в начале сессии Gemini / AI Studio

1. Прочитать `AGENTS.md` целиком (если импорт `@AGENTS.md` не развёрнут средой автоматически).
2. Проверить `docs/agent/DECISIONS.md`, чтобы не противоречить принятым UX- и архитектурным решениям.
3. Проверить `docs/agent/HANDOFF.md` для понимания текущего статуса проекта.
4. Подгрузить профильную спецификацию по задаче:
   - UI и стили → `docs/agent/DESIGN_SYSTEM.md`
   - Движок, кэш и раскладка → `docs/agent/ARCHITECTURE.md`
   - Данные веток → `BRANCH_SPEC.md` и `BRANCH_CATALOG.md`
5. После каждой решённой задачи обновить `docs/agent/HANDOFF.md` (при > 5 записях запустить `npm run handoff:rotate`) и прогнать `npm run verify` (проверяет в том числе обновление `HANDOFF.md` по `git diff`).
