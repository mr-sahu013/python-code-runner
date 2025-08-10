import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req) {
  const { code } = await req.json();

  // Save Python code to a temporary file
  const filePath = path.join(process.cwd(), "temp.py");
  fs.writeFileSync(filePath, code);

  return new Promise((resolve) => {
    exec(`python "${filePath}"`, (error, stdout, stderr) => {
      let output = stdout;
      let isError = false;

      if (error) {
        output = stderr;
        isError = true;
      }

      resolve(
        new Response(JSON.stringify({ output, isError }), { status: 200 })
      );
    });
  });
}
