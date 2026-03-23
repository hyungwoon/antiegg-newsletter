import "dotenv/config";
import { readFile } from "fs/promises";
import * as readline from "readline";

const STIBEE_API_KEY = process.env.STIBEE_API_KEY ?? "";
const STIBEE_LIST_ID = Number(process.env.STIBEE_LIST_ID ?? "85471");
const STIBEE_LIST_ID_TEST = Number(process.env.STIBEE_LIST_ID_TEST ?? "237526");

function parseArgs(argv: string[]): { subject: string; bodyFile: string; list: "newsletter" | "test" } {
  const args = argv.slice(2);
  let subject = "";
  let bodyFile = "";
  let list: "newsletter" | "test" = "test";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--subject" && args[i + 1]) {
      subject = args[++i];
    } else if (args[i] === "--body-file" && args[i + 1]) {
      bodyFile = args[++i];
    } else if (args[i] === "--list" && args[i + 1]) {
      const val = args[++i];
      if (val === "newsletter" || val === "test") {
        list = val;
      } else {
        console.error(`Invalid --list value: "${val}". Must be "newsletter" or "test".`);
        process.exit(1);
      }
    }
  }

  if (!subject) {
    console.error("Error: --subject is required.");
    process.exit(1);
  }
  if (!bodyFile) {
    console.error("Error: --body-file is required.");
    process.exit(1);
  }

  return { subject, bodyFile, list };
}

async function confirm(message: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log(message);
    rl.question("", () => {
      rl.close();
      resolve();
    });
  });
}

async function sendEmail(listId: number, subject: string, body: string): Promise<void> {
  if (!STIBEE_API_KEY) {
    console.error("Error: STIBEE_API_KEY is not set in environment.");
    process.exit(1);
  }

  const payload = {
    listId,
    Subject: subject,
    Body: body,
    FromName: "ANTIEGG",
    FromEmail: "newsletter@antiegg.kr",
  };

  const res = await fetch(`https://api.stibee.com/v1/lists/${listId}/emails`, {
    method: "POST",
    headers: {
      AccessToken: STIBEE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as { Ok: boolean; Error?: string; Value?: unknown };

  if (!res.ok || !data.Ok) {
    console.error("Stibee API error:", data.Error ?? JSON.stringify(data));
    process.exit(1);
  }

  console.log("Sent successfully.");
  console.log("Response:", JSON.stringify(data.Value ?? data, null, 2));
}

async function main(): Promise<void> {
  const { subject, bodyFile, list } = parseArgs(process.argv);

  const body = await readFile(bodyFile, "utf-8");

  const listId = list === "newsletter" ? STIBEE_LIST_ID : STIBEE_LIST_ID_TEST;
  const listLabel = list === "newsletter"
    ? `NEWSLETTER list (${STIBEE_LIST_ID})`
    : `TEST list (${STIBEE_LIST_ID_TEST})`;

  console.log(`Subject : ${subject}`);
  console.log(`Body    : ${bodyFile} (${body.length} chars)`);
  console.log(`List    : ${listLabel}`);

  if (list === "newsletter") {
    await confirm(`\nSending to NEWSLETTER list (${STIBEE_LIST_ID}). Press enter to continue or Ctrl+C to cancel`);
  }

  await sendEmail(listId, subject, body);
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
