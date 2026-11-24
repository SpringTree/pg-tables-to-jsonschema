import { createInterface } from "node:readline";

// Thrown when the user presses ctrl+c at the prompt
//
export class PromptAbortedError extends Error {
  constructor() {
    super("Password prompt aborted");
    this.name = "PromptAbortedError";
  }
}

// Asks for a password on the terminal without echoing it.
// - On a terminal (TTY) the input is switched to raw mode and read key by key:
//   enter finishes, backspace removes the last character and ctrl+c rejects with PromptAbortedError
// - Without a terminal (piped input) the first line is read as is
//
export async function promptPassword(
  message: string,
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  output.write(message);

  if (!input.isTTY) {
    const lineReader = createInterface({ input });
    for await (const line of lineReader) {
      lineReader.close();
      return line;
    }
    return "";
  }

  input.setRawMode(true);
  input.setEncoding("utf8");
  input.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    const finish = () => {
      input.off("data", onKeys);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
    };

    // A chunk holds several characters when text is pasted
    //
    const onKeys = (keys: string) => {
      for (const key of keys) {
        if (key === "\r" || key === "\n") {
          finish();
          resolve(password);
          return;
        }
        if (key === "\u0003") {
          // ctrl+c
          finish();
          reject(new PromptAbortedError());
          return;
        }
        if (key === "\u007f" || key === "\b") {
          // backspace or delete
          password = password.slice(0, -1);
          continue;
        }
        password += key;
      }
    };

    input.on("data", onKeys);
  });
}

//
