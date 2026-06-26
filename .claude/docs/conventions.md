---
description: JSDoc conventions, dependencies, and testing notes
---

# Conventions

## JSDoc Function Documentation

### Required fields

| Field | Format | Purpose |
|---|---|---|
| One-line description | First line after `/**` | What the function does |
| Extended description | Paragraph(s) after the one-liner | Why it exists, when to use it, context |
| `@param` | `@param {Type} name - description` | Each parameter |
| `@returns` | `@returns {Type} - description` | Return value |

### Optional but encouraged

- **Usage example**: indented code block showing correct (and incorrect) call patterns — include when the function has strict calling constraints or non-obvious usage (e.g. must be called inside a lock, requires a specific argument shape)
- **Algorithm** block: step-by-step walkthrough for complex logic
- **CAPS warnings**: e.g. `MUST ONLY be called within withRecurringTaskLock()`
- **Side Effects** section: list global state mutations (e.g. `tasks.push(...)`, `saveData()`)
- **Callers** section: list every call site for functions with strict calling constraints

### Skeleton

```javascript
/**
 * functionName(param1, param2)
 *
 * One-line summary of what it does.
 *
 * Extended explanation: why it exists, invariants it maintains, constraints.
 *
 * @param {String} param1 - description
 * @param {Object} param2 - description
 * @returns {Boolean} - description
 *
 * Example:                    ← include only when usage is non-obvious or constrained
 *   // WRONG:
 *   functionName(x, y);
 *
 *   // RIGHT:
 *   await withRecurringTaskLock(() => functionName(x, y));
 */
function functionName(param1, param2) {
```

## No Automated Tests

There is no test suite. The `postinstall` script only creates an initial `data.json`. Data integrity relies on atomic writes and backup files, not tests.

## Dependencies

**npm** (see `package.json`):
- `express` 4.18.2
- `body-parser` 1.20.1
- `openai` 5.0.1

**CDN** (loaded in `admin.html`):
- Bootstrap 5.3.0
- Bootstrap Icons 1.10.5
- Chart.js 4.3.0

**Node.js built-ins**: `fs`, `path`, `https`, `child_process`
