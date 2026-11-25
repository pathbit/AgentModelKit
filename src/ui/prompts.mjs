import readline from "node:readline";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
};

function clearLines(output, count) {
  if (count <= 0) return;
  for (let i = 0; i < count; i++) {
    output.write("\x1b[1A\x1b[2K");
  }
}

/**
 * Prompt for a single line of text with an optional default value.
 */
export function promptText(question, defaultValue = "", {
  input = process.stdin, output = process.stdout, secret = false,
} = {}) {
  if (secret) {
    if (!canUseRawMode(input, output)) throw new Error("Use --key-file ou uma variavel de ambiente neste terminal.");
    output.write(question);
    let answer = "";
    return runRawSelector({
      input,
      output,
      render: () => [],
      onKey(str, key) {
        if (key.name === "return" || key.name === "enter") return { done: true, value: answer.trim() };
        if (key.name === "backspace") answer = answer.slice(0, -1);
        else if (str && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(str)) answer += str;
        return null;
      },
    }).finally(() => output.write("\n"));
  }
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve, reject) => {
    rl.once("close", () => reject(new Error("Entrada encerrada.")));
    rl.once("SIGINT", () => rl.close());
    rl.question(question, (answer) => {
      resolve(answer.trim() || defaultValue);
      rl.close();
    });
  });
}

function canUseRawMode(input, output, isRawSupported) {
  if (typeof isRawSupported === "boolean") return isRawSupported;
  return Boolean(input?.isTTY && output?.isTTY && typeof input.setRawMode === "function");
}

function runRawSelector({
  input = process.stdin,
  output = process.stdout,
  render,
  onKey,
}) {
  return new Promise((resolve, reject) => {
    readline.emitKeypressEvents(input);
    const wasRaw = input.isRaw;
    if (typeof input.setRawMode === "function") input.setRawMode(true);
    input.resume();
    output.write(ANSI.hideCursor);

    let lastLineCount = 0;

    function draw(warning = "") {
      clearLines(output, lastLineCount);
      const lines = render(warning);
      if (lines.length) output.write(lines.join("\n") + "\n");
      lastLineCount = lines.length;
    }

    function cleanup() {
      input.removeListener("keypress", handleKeypress);
      input.removeListener("end", handleEnd);
      if (typeof input.setRawMode === "function") {
        try {
          input.setRawMode(Boolean(wasRaw));
        } catch {
          // Ignore stream teardown errors
        }
      }
      input.pause();
      output.write(ANSI.showCursor);
    }

    function handleEnd() {
      cleanup();
      reject(new Error("Entrada encerrada."));
    }

    function handleKeypress(str, key = {}) {
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        reject(new Error("Operacao cancelada pelo usuario."));
        return;
      }

      const outcome = onKey(str, key);
      if (outcome?.done) {
        clearLines(output, lastLineCount);
        cleanup();
        resolve(outcome.value);
        return;
      }
      draw(outcome?.warning || "");
    }

    input.on("keypress", handleKeypress);
    input.once("end", handleEnd);
    draw();
  });
}

/**
 * Interactive single-select prompt using arrow keys (falls back to numeric choice when non-TTY).
 */
export async function promptSelect({
  title,
  options,
  defaultIndex = 0,
  input = process.stdin,
  output = process.stdout,
  isRawSupported,
}) {
  if (!options?.length) {
    throw new Error("promptSelect requires at least one option.");
  }

  if (!canUseRawMode(input, output, isRawSupported)) {
    output.write(`\n${title}\n`);
    for (let i = 0; i < options.length; i++) {
      output.write(`  ${i + 1}) ${options[i].label}\n`);
    }
    const raw = await promptText(`Escolha [padrao ${defaultIndex + 1}]: `, String(defaultIndex + 1), { input, output });
    const idx = Number.parseInt(raw, 10) - 1;
    const chosen = Number.isInteger(idx) && idx >= 0 && idx < options.length ? options[idx] : options[defaultIndex];
    return chosen.value;
  }

  let cursor = Math.min(Math.max(defaultIndex, 0), options.length - 1);
  const chosenValue = await runRawSelector({
    input,
    output,
    render() {
      const lines = [
        `${ANSI.bold}${title}${ANSI.reset} ${ANSI.dim}(↑↓ mover, Enter confirmar)${ANSI.reset}`,
      ];
      for (let i = 0; i < options.length; i++) {
        const active = i === cursor;
        const prefix = active ? `${ANSI.cyan}❯${ANSI.reset}` : " ";
        const text = active ? `${ANSI.cyan}${options[i].label}${ANSI.reset}` : options[i].label;
        const hint = options[i].hint ? ` ${ANSI.dim}${options[i].hint}${ANSI.reset}` : "";
        lines.push(`${prefix} ${text}${hint}`);
      }
      return lines;
    },
    onKey(_str, key) {
      if (key.name === "up" || key.name === "k") {
        cursor = (cursor - 1 + options.length) % options.length;
      } else if (key.name === "down" || key.name === "j") {
        cursor = (cursor + 1) % options.length;
      } else if (key.name === "return" || key.name === "enter") {
        return { done: true, value: options[cursor].value };
      }
      return null;
    },
  });

  output.write(`${ANSI.green}✔${ANSI.reset} ${title}: ${options.find((o) => o.value === chosenValue)?.label}\n`);
  return chosenValue;
}

/**
 * Interactive scrollable checkbox multi-select (`Space` toggles `[x]`, `a` toggles all, `Enter` confirms).
 */
export async function promptMultiSelect({
  title,
  subtitle = "",
  options,
  pageSize = 14,
  minSelected = 1,
  input = process.stdin,
  output = process.stdout,
  isRawSupported,
}) {
  if (!options?.length) return [];

  if (!canUseRawMode(input, output, isRawSupported)) {
    output.write(`\n${title}\n`);
    const defaultNums = [];
    for (let i = 0; i < options.length; i++) {
      const mark = options[i].checked ? "[x]" : "[ ]";
      if (options[i].checked) defaultNums.push(String(i + 1));
      output.write(`  ${i + 1}) ${mark} ${options[i].label}\n`);
    }
    const answer = await promptText(
      `Marque os numeros separados por virgula [Enter = ${defaultNums.join(",") || "todos"}]: `,
      defaultNums.join(","),
      { input, output }
    );
    if (!answer) {
      return options.map((o) => o.value);
    }
    const indices = answer
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10) - 1)
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < options.length);
    const unique = [...new Set(indices)].map((idx) => options[idx].value);
    return unique.length >= minSelected ? unique : options.filter((o) => o.checked).map((o) => o.value);
  }

  let cursor = 0;
  let scrollOffset = 0;
  const selected = new Set(options.map((o, idx) => (o.checked ? idx : -1)).filter((i) => i >= 0));

  function ensureCursorVisible() {
    if (cursor < scrollOffset) scrollOffset = cursor;
    else if (cursor >= scrollOffset + pageSize) scrollOffset = cursor - pageSize + 1;
  }

  const values = await runRawSelector({
    input,
    output,
    render(warning) {
      ensureCursorVisible();
      const lines = [
        `${ANSI.bold}${title}${ANSI.reset} ${ANSI.dim}(${selected.size}/${options.length} marcados | ↑↓ mover, Espaço marcar, a todos, Enter confirmar)${ANSI.reset}`,
      ];
      if (subtitle) lines.push(`${ANSI.dim}${subtitle}${ANSI.reset}`);

      const end = Math.min(options.length, scrollOffset + pageSize);
      if (scrollOffset > 0) lines.push(`${ANSI.dim}  ↑ ... +${scrollOffset} acima${ANSI.reset}`);

      for (let i = scrollOffset; i < end; i++) {
        const opt = options[i];
        const isCur = i === cursor;
        const isChecked = selected.has(i);
        const pointer = isCur ? `${ANSI.cyan}❯${ANSI.reset}` : " ";
        const box = isChecked ? `${ANSI.green}[x]${ANSI.reset}` : `${ANSI.dim}[ ]${ANSI.reset}`;
        const label = isCur ? `${ANSI.cyan}${opt.label}${ANSI.reset}` : opt.label;
        const hint = opt.hint ? ` ${ANSI.dim}${opt.hint}${ANSI.reset}` : "";
        lines.push(`${pointer} ${box} ${label}${hint}`);
      }

      if (end < options.length) lines.push(`${ANSI.dim}  ↓ ... +${options.length - end} abaixo${ANSI.reset}`);
      if (warning) lines.push(`${ANSI.yellow}! ${warning}${ANSI.reset}`);
      return lines;
    },
    onKey(str, key) {
      if (key.name === "up" || key.name === "k") {
        cursor = (cursor - 1 + options.length) % options.length;
      } else if (key.name === "down" || key.name === "j") {
        cursor = (cursor + 1) % options.length;
      } else if (key.name === "pageup") {
        cursor = Math.max(0, cursor - pageSize);
      } else if (key.name === "pagedown") {
        cursor = Math.min(options.length - 1, cursor + pageSize);
      } else if (key.name === "space" || str === " ") {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (key.name === "a" || str === "a" || str === "A") {
        if (selected.size === options.length) selected.clear();
        else options.forEach((_, idx) => selected.add(idx));
      } else if (key.name === "return" || key.name === "enter") {
        if (selected.size < minSelected) {
          return { warning: `Selecione pelo menos ${minSelected} item.` };
        }
        const ordered = [...selected].sort((a, b) => a - b).map((idx) => options[idx].value);
        return { done: true, value: ordered };
      }
      return null;
    },
  });

  output.write(`${ANSI.green}✔${ANSI.reset} ${title}: ${values.length} selecionado(s)\n`);
  return values;
}
