import { expect, mock, test } from "bun:test";
import { PassThrough } from "node:stream";
import { PromptAbortedError, promptPassword } from "../src/prompt-password.js";

// A stand-in for a terminal: a stream that records the raw mode switches
//
function createTerminalInput() {
  return Object.assign(new PassThrough(), { isTTY: true, setRawMode: mock() });
}

function createPipedInput() {
  return Object.assign(new PassThrough(), { isTTY: false });
}

function asReadStream(input: PassThrough) {
  return input as unknown as NodeJS.ReadStream;
}

test("successfully read the password from a terminal without echoing it", async () => {
  const input = createTerminalInput();
  const output = new PassThrough();
  const writtenText: string[] = [];
  output.on("data", (chunk: Buffer) => writtenText.push(chunk.toString()));

  const passwordPromise = promptPassword("Password? ", asReadStream(input), output);
  input.write("secret\r");

  expect(await passwordPromise).toBe("secret");
  expect(writtenText.join("")).toBe("Password? \n");
  expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
});

test("successfully remove the last character when backspace is pressed", async () => {
  const input = createTerminalInput();

  const passwordPromise = promptPassword("Password? ", asReadStream(input), new PassThrough());
  input.write("secrex\u007f");
  input.write("t\bT\n");

  expect(await passwordPromise).toBe("secreT");
});

test("successfully ignore the characters after enter when text is pasted", async () => {
  const input = createTerminalInput();

  const passwordPromise = promptPassword("Password? ", asReadStream(input), new PassThrough());
  input.write("secret\rignored");

  expect(await passwordPromise).toBe("secret");
});

test("successfully read the first line when the input is piped", async () => {
  const input = createPipedInput();

  const passwordPromise = promptPassword("Password? ", asReadStream(input), new PassThrough());
  input.end("secret\nsecond line\n");

  expect(await passwordPromise).toBe("secret");
});

test("successfully return an empty password when the piped input is empty", async () => {
  const input = createPipedInput();

  const passwordPromise = promptPassword("Password? ", asReadStream(input), new PassThrough());
  input.end();

  expect(await passwordPromise).toBe("");
});

test("fail reading the password when ctrl+c is pressed", async () => {
  const input = createTerminalInput();

  const passwordPromise = promptPassword("Password? ", asReadStream(input), new PassThrough());
  input.write("sec\u0003");

  const rejection = await passwordPromise.catch((error: unknown) => error);
  expect(rejection).toBeInstanceOf(PromptAbortedError);
  expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
});

//
