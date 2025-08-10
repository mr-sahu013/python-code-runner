"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function CodeRunner() {
  const [code, setCode] = useState(`# Example using Python

print("Hello World!")

`);
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pyLoading, setPyLoading] = useState(true);
  const pyodideRef = useRef(null);

  useEffect(() => {
    let canceled = false;

    async function loadPyodideAndPackages() {
      setPyLoading(true);
      try {
        // 1) load pyodide script
        if (!window.loadPyodide) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            // version URL — you can update version if needed
            s.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }

        // 2) initialize pyodide
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
        });

        // 3) load common packages (numpy included)
        // you can add packages to this array if needed
        await pyodide.loadPackage(["numpy"]);

        pyodideRef.current = pyodide;
        if (!canceled) setPyLoading(false);
      } catch (err) {
        console.error("Pyodide load error:", err);
        if (!canceled) {
          setOutput("Failed to load Python runtime: " + String(err));
          setIsError(true);
          setPyLoading(false);
        }
      }
    }

    loadPyodideAndPackages();

    return () => {
      canceled = true;
    };
  }, []);

  // Helper to indent user code inside try block
  function indentUserCode(uCode) {
    return uCode
      .split("\n")
      .map((l) => (l.trim() === "" ? "" : "    " + l))
      .join("\n");
  }

  const runCode = async () => {
    setLoading(true);
    setOutput("");
    setIsError(false);

    if (!pyodideRef.current) {
      setOutput("Python runtime not ready yet. Wait for it to finish loading.");
      setIsError(true);
      setLoading(false);
      return;
    }

    const pyodide = pyodideRef.current;

    // Wrap user code to capture stdout and stderr
    const wrapped = `
import sys
from io import StringIO
_out = StringIO()
_err = StringIO()
_old_out, _old_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _out, _err
try:
${indentUserCode(code)}
except Exception:
    import traceback
    traceback.print_exc(file=_err)
finally:
    sys.stdout, sys.stderr = _old_out, _old_err
(_out.getvalue(), _err.getvalue())
`;

    try {
      // run and get (stdout, stderr) as a Python tuple
      const res = await pyodide.runPythonAsync(wrapped);

      // res may be a PyProxy — convert safely
      let out = "";
      let err = "";

      if (res && typeof res.toJs === "function") {
        // PyProxy -> JS
        const arr = res.toJs();
        out = arr[0] || "";
        err = arr[1] || "";
        try {
          res.destroy && res.destroy(); // cleanup proxy if available
        } catch {}
      } else if (Array.isArray(res)) {
        out = res[0] || "";
        err = res[1] || "";
      } else {
        // fallback
        const s = String(res || "");
        out = s;
      }

      // If there is stderr content, treat as error (shows in red)
      const combined = (out ? out : "") + (err ? (out ? "\n" : "") + err : "");
      setOutput(combined || "Program finished with no output.");
      setIsError(Boolean(err && err.trim().length > 0));
    } catch (e) {
      // Pyodide-level failure (syntax errors can also appear here)
      setOutput(String(e));
      setIsError(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">🐍 Python Runner</h1>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">Python</span>
            {pyLoading ? (
              <span className="text-sm text-yellow-300">Loading Python runtime…</span>
            ) : (
              <span className="text-sm text-green-300">Runtime ready loaded</span>
            )}
          </div>

          <button
            onClick={runCode}
            disabled={loading || pyLoading}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Running..." : "Run ▶"}
          </button>
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-700">
          <MonacoEditor
            height="420px"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Output:</h2>
          <pre
            className={`bg-black p-4 rounded-lg border border-gray-700 overflow-auto whitespace-pre-wrap ${
              isError ? "text-red-400" : "text-green-400"
            }`}
            style={{ maxHeight: "350px" }}
          >
            {output || (pyLoading ? "Loading Python runtime..." : "Run your code to see output here...")}
          </pre>
        </div>
      </div>
    </div>
  );
}
