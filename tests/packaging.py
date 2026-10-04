#!/usr/bin/env python3
"""Verify bundled resources and the standalone launcher contract."""
from importlib.resources import files
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import shutil

ROOT = Path(__file__).resolve().parents[1]
launcher = ROOT / "skills/raisecontext/raisecontext"
assert files("raisecontext_client").joinpath("schema.json").read_bytes() == (ROOT / "skills/raisecontext/references/schema.json").read_bytes()
assert re.search(r"raisecontext\.git@[0-9a-f]{40}", launcher.read_text())
assert launcher.stat().st_mode & 0o111
with tempfile.TemporaryDirectory(prefix="raisecontext-launcher-") as directory:
    copied = Path(directory) / "raisecontext"
    shutil.copyfile(launcher, copied)
    result = subprocess.run([sys.executable, str(copied), "--help"], cwd=directory, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert "raisecontext" in result.stdout
print("PASS: packaged schema and copied full-name launcher")
