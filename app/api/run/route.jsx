


import axios from "axios";

export async function POST(req) {
  const { language, code } = await req.json();

  const langMap = {
    python: 71,
    cpp: 54,
    c: 50,
    java: 62,
    javascript: 63,
  };

  try {
    const submission = await axios.post(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        source_code: code,
        language_id: langMap[language],
        stdin: "",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": "37ca7849b6msh519ac9942a666acp1382f1jsn46f83550a628",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
      }
    );

    // ✅ Capture exact output from Judge0
    const output =
      submission.data.compile_output ||
      submission.data.stderr ||
      submission.data.stdout ||
      "No output.";

    return new Response(JSON.stringify({ output }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ output: error.response?.data || error.message }),
      { status: 500 }
    );
  }
}
