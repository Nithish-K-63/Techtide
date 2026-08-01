#!/usr/bin/env python3
"""
Resume Extraction Test Script
==============================
Runs the ResumeParser against every PDF in server/uploads/,
prints a structured JSON output per resume, and builds a
precision report showing which fields were extracted vs missed.

Usage:
    python test_resume_parser.py
"""

import json
import sys
import io
import re
from pathlib import Path

# Force UTF-8 stdout encoding for Windows compatibility
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app import ResumeParser, SKILL_ALIASES, extract_skills_from_text

UPLOADS_DIR = ROOT / "server" / "uploads"
PARSER = ResumeParser()

FIELD_WEIGHTS = {
    "name": 15, "email": 10, "phone": 10,
    "linkedin": 5, "github": 5,
    "summary": 5,
    "skills": 20, "experience": 15, "education": 10,
    "projects": 5, "certifications": 0,
}

def field_score(rd: dict) -> tuple[float, dict]:
    breakdown = {}
    earned = 0.0
    total  = sum(FIELD_WEIGHTS.values())

    for f, w in FIELD_WEIGHTS.items():
        val = rd.get(f, "")
        ok  = bool(val) if isinstance(val, str) else len(val) > 0
        breakdown[f] = {"ok": ok, "weight": w, "value_preview": _preview(val)}
        if ok:
            earned += w

    return round((earned / total) * 100, 1), breakdown

def _preview(val) -> str:
    if isinstance(val, str):
        return val[:80] + "..." if len(val) > 80 else val
    if isinstance(val, list):
        return f"[{len(val)} items]  " + str(val[:3])[:120]
    return str(val)[:80]

def run_tests():
    pdfs = sorted(UPLOADS_DIR.glob("*.pdf"))
    if not pdfs:
        print("[-] No PDF files found in server/uploads/")
        return

    total_score   = 0.0
    all_skill_ids = set()

    print("=" * 70)
    print(f"  ResumeParser Test Suite  --  {len(pdfs)} PDF(s) found")
    print("=" * 70)

    for idx, pdf_path in enumerate(pdfs, 1):
        print(f"\n{'-'*70}")
        print(f"  [{idx}/{len(pdfs)}]  {pdf_path.name}  ({pdf_path.stat().st_size // 1024} KB)")
        print(f"{'-'*70}")

        try:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            rd = PARSER.parse(pdf_bytes)
        except Exception as e:
            print(f"  [X] Parser crashed: {e}")
            continue

        print(f"  Layout:  {rd['columns_detected']}-column")
        print(f"  Raw text length: {len(rd.get('raw_text', ''))} chars")

        score, breakdown = field_score(rd)
        total_score += score

        print(f"\n  Field Precision:  {score:.1f} / 100")
        print()
        for field, info in breakdown.items():
            status = "[OK]" if info["ok"] else "[  ]"
            label = f"{field:<18}"
            prev  = info["value_preview"] if info["ok"] else "(empty)"
            print(f"    {status}  {label}  {prev}")

        combined_text = " ".join(rd.get("skills", [])) + "\n" + rd.get("raw_text", "")
        matched_skills = extract_skills_from_text(combined_text)
        skill_ids = [s["id"] for s in matched_skills]
        all_skill_ids.update(skill_ids)

        print(f"\n  Skills matched from SKILL_ALIASES ({len(skill_ids)}):")
        for i in range(0, len(skill_ids), 8):
            print("    ", "  ".join(skill_ids[i:i+8]))

        rd_display = {k: v for k, v in rd.items() if k != "raw_text"}
        print("\n  Structured JSON (excluding raw_text):")
        lines = json.dumps(rd_display, indent=4, ensure_ascii=False).split("\n")
        for line in lines[:60]:
            print("    " + line)
        if len(lines) > 60:
            print(f"    ... ({len(lines) - 60} more lines)")

    avg = total_score / len(pdfs)
    print(f"\n{'='*70}")
    print(f"  AGGREGATE RESULTS")
    print(f"{'='*70}")
    print(f"  PDFs tested          : {len(pdfs)}")
    print(f"  Average field score  : {avg:.1f} / 100")
    print(f"  Unique skill IDs     : {len(all_skill_ids)}")
    print(f"  Skills found overall : {sorted(all_skill_ids)}")
    print()

    if avg < 50:
        print("  [-] LOW precision (<50). Check sections / layout.")
    elif avg < 75:
        print("  [~] MEDIUM precision. Add keywords if needed.")
    else:
        print("  [+] HIGH precision (>=75). Parser working well!")

    print("=" * 70)

if __name__ == "__main__":
    run_tests()
