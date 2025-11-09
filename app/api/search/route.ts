import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Path to the Python script
    const pythonScriptPath = path.join(
      process.cwd(),
      "python",
      "src",
      "search_api.py"
    );

    // Check for virtual environment in python directory
    const pythonDir = path.join(process.cwd(), "python");
    const venvPython = path.join(pythonDir, "venv", "bin", "python3");
    const venvPythonWin = path.join(pythonDir, "venv", "Scripts", "python.exe");
    const poetryPython = path.join(pythonDir, ".venv", "bin", "python3");
    const poetryPythonWin = path.join(pythonDir, ".venv", "Scripts", "python.exe");
    
    // Determine which Python to use
    let pythonPath = process.env.PYTHON_PATH;
    if (!pythonPath) {
      // Try Poetry venv first (Unix/Mac)
      if (fs.existsSync(poetryPython)) {
        pythonPath = poetryPython;
        console.log("Using Poetry virtual environment");
      }
      // Try Poetry venv (Windows)
      else if (fs.existsSync(poetryPythonWin)) {
        pythonPath = poetryPythonWin;
        console.log("Using Poetry virtual environment (Windows)");
      }
      // Try regular venv (Unix/Mac)
      else if (fs.existsSync(venvPython)) {
        pythonPath = venvPython;
        console.log("Using virtual environment");
      }
      // Try regular venv (Windows)
      else if (fs.existsSync(venvPythonWin)) {
        pythonPath = venvPythonWin;
        console.log("Using virtual environment (Windows)");
      }
      // Fallback to system python3
      else {
        pythonPath = "python3";
        console.log("WARNING: Using system python3 - dependencies may not be installed");
      }
    }
    
    const pythonSrcDir = path.join(pythonDir, "src");
    
    // Escape the query for shell execution
    const escapedQuery = query.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    
    try {
      console.log(`Executing: ${pythonPath} "${pythonScriptPath}" "${escapedQuery}"`);
      console.log(`Working directory: ${pythonSrcDir}`);
      
      const { stdout, stderr } = await execAsync(
        `"${pythonPath}" "${pythonScriptPath}" "${escapedQuery}"`,
        {
          cwd: pythonSrcDir,
          env: {
            ...process.env,
            PYTHONPATH: pythonSrcDir,
          },
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      console.log("Python stdout:", stdout?.substring(0, 200));
      if (stderr) {
        console.log("Python stderr:", stderr?.substring(0, 500));
      }

      // Check for module import errors in stderr
      if (stderr) {
        if (stderr.includes("ModuleNotFoundError") || stderr.includes("No module named")) {
          console.error("Python dependencies not installed. Error:", stderr);
          return NextResponse.json(
            { 
              error: "Python dependencies not installed",
              details: "Please install Python dependencies by running: cd python && pip install -r requirements.txt",
              stderr: stderr
            },
            { status: 500 }
          );
        }
        // Log other stderr messages but don't fail (INFO/WARNING are okay)
        if (!stderr.includes("INFO") && !stderr.includes("WARNING")) {
          console.error("Python script stderr:", stderr);
        }
      }

      // Parse the JSON output
      if (!stdout || stdout.trim() === "") {
        return NextResponse.json(
          { error: "No output from Python script", stderr: stderr || "No stderr output" },
          { status: 500 }
        );
      }

      let results;
      try {
        results = JSON.parse(stdout.trim());
      } catch {
        console.error("Failed to parse JSON output:", stdout.substring(0, 500));
        return NextResponse.json(
          { 
            error: "Failed to parse Python script output",
            details: "The Python script did not return valid JSON",
            stdout: stdout.substring(0, 500),
            stderr: stderr || ""
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ results });
    } catch (execError) {
      // Handle execution errors - execAsync throws errors with stdout/stderr properties
      const execErr = execError as { stdout?: string; stderr?: string; message?: string; code?: number };
      
      console.error("Python execution error:", {
        message: execErr.message,
        code: execErr.code,
        stdout: execErr.stdout?.substring(0, 500),
        stderr: execErr.stderr?.substring(0, 500)
      });

      if (execErr.stderr) {
        if (execErr.stderr.includes("ModuleNotFoundError") || execErr.stderr.includes("No module named")) {
          const installInstructions = pythonPath.includes("venv") || pythonPath.includes(".venv")
            ? "Python dependencies are not installed in the virtual environment. Please run: cd python && source venv/bin/activate && pip install -r requirements.txt (or on Windows: cd python && venv\\Scripts\\activate && pip install -r requirements.txt)"
            : "Python dependencies are not installed. Please either:\n1. Create a virtual environment: cd python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt\n2. Or use Poetry: cd python && poetry install\n3. Or install system-wide: cd python && pip install -r requirements.txt";
          
          return NextResponse.json(
            { 
              error: "Python dependencies not installed",
              details: installInstructions,
              stderr: execErr.stderr,
              pythonPath: pythonPath,
              scriptPath: pythonScriptPath,
              detectedVenv: pythonPath.includes("venv") || pythonPath.includes(".venv")
            },
            { status: 500 }
          );
        }
      }

      // Return detailed error information
      return NextResponse.json(
        {
          error: "Python script execution failed",
          details: execErr.message || "Unknown execution error",
          stdout: execErr.stdout || "",
          stderr: execErr.stderr || "",
          code: execErr.code,
          pythonPath: pythonPath,
          scriptPath: pythonScriptPath
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in search API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to perform search", 
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

