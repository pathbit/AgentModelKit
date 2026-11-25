import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";

import { promptMultiSelect, promptSelect } from "../src/ui/prompts.mjs";

function createMockStreams() {
  const input = new PassThrough();
  const output = new PassThrough();
  let captured = "";
  output.on("data", (chunk) => {
    captured += chunk.toString("utf8");
  });
  input.isTTY = true;
  output.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (mode) => {
    input.isRaw = mode;
  };
  return { input, output, getOutput: () => captured };
}

test("promptMultiSelect toggles checkboxes with Space, Down, 'a', and confirms on Enter", async () => {
  const { input, output, getOutput } = createMockStreams();

  const promise = promptMultiSelect({
    title: "Escolha servicos",
    options: [
      { label: "OpenCode Free", value: "free", checked: true },
      { label: "OpenCode Go", value: "go", checked: false },
      { label: "FreeLLMAPI", value: "freellmapi", checked: false },
    ],
    input,
    output,
    isRawSupported: true,
  });

  // Wait a tick for keypress listener registration, then navigate & toggle
  setImmediate(() => {
    input.write("\x1b[B"); // Down -> OpenCode Go
    input.write(" "); // Space -> check OpenCode Go
    input.write("\x1b[B"); // Down -> FreeLLMAPI
    input.write(" "); // Space -> check FreeLLMAPI
    input.write("\r"); // Enter -> confirm all 3
  });

  const result = await promise;
  assert.deepEqual(result, ["free", "go", "freellmapi"]);
  const plain = getOutput().replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
  assert.match(plain, /\[x\] OpenCode Free/);
});

test("promptMultiSelect toggles all items with 'a' and enforces minSelected", async () => {
  const { input, output } = createMockStreams();

  const promise = promptMultiSelect({
    title: "Escolha modelos",
    options: [
      { label: "Modelo A", value: "a", checked: false },
      { label: "Modelo B", value: "b", checked: false },
    ],
    minSelected: 1,
    input,
    output,
    isRawSupported: true,
  });

  setImmediate(() => {
    input.write("\r"); // Attempt confirm with 0 selected (blocked)
    input.write("a"); // Select all
    input.write("\r"); // Confirm
  });

  const result = await promise;
  assert.deepEqual(result, ["a", "b"]);
});

test("promptSelect navigates with Down arrow and confirms with Enter, plus non-TTY fallback", async () => {
  const { input, output } = createMockStreams();

  const rawPromise = promptSelect({
    title: "Modo",
    options: [
      { label: "Auto", value: "auto" },
      { label: "Strategies", value: "strategies" },
    ],
    input,
    output,
    isRawSupported: true,
  });

  setImmediate(() => {
    input.write("\x1b[B"); // Down -> Strategies
    input.write("\r");
  });

  assert.equal(await rawPromise, "strategies");

  // Non-TTY fallback with comma selection for promptMultiSelect
  const nonTtyIn = new PassThrough();
  const nonTtyOut = new PassThrough();
  const fallbackPromise = promptMultiSelect({
    title: "Servicos",
    options: [
      { label: "Item 1", value: "one", checked: true },
      { label: "Item 2", value: "two", checked: false },
    ],
    input: nonTtyIn,
    output: nonTtyOut,
    isRawSupported: false,
  });
  setImmediate(() => {
    nonTtyIn.write("2\n");
  });
  assert.deepEqual(await fallbackPromise, ["two"]);
});
