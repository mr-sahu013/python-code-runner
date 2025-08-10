"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import axios from "axios";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function CodeRunner() {
  const [code, setCode] = useState("# Write your Python code here\nprint('Hello, World!')");
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/pyrun", { code });
      setOutput(res.data.output);
      setIsError(res.data.isError);
    } catch (err) {
      setOutput("Error running code");
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">🐍 Python Code Runner</h1>

        <div className="flex items-center justify-between mb-4">
          <span className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
            Python
          </span>

          <button
            onClick={runCode}
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Code ▶"}
          </button>
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-700">
          <MonacoEditor
            height="400px"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Output:</h2>
          <pre
            className={`bg-black p-4 rounded-lg border border-gray-700 overflow-auto ${
              isError ? "text-red-400" : "text-green-400"
            }`}
          >
            {output || "Run your code to see output here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
