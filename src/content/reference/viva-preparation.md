---
title: "Viva Preparation Checklist Before Viva Starts"
sourceType: pdf
sourceFile: "screencapture-viva_preparation_checklist.pdf"
course: "CS2006P"
lastVerified: "2026-09-18"
---

# Viva Preparation Checklist Before Viva Starts

> **Document Note**: This document contains the mandatory technical, environmental, and hardware requirements for students appearing in Level 1 and Level 2 viva examinations for MAD-2 (CS2006P).

---

## 1. Important Note: Dual Camera Setup (Level 1 & Level 2)

- **Two-Device Requirement**: Students must join the Google Meet from both a computer (PC/laptop) and a mobile phone.
- **Positioning**: Position the phone so that your **hands, face, and laptop screen** are clearly visible simultaneously in the phone's camera feed.
- **Audio Echo Prevention**: Ensure one of the devices is muted (mic and speaker) to avoid audio feedback/echo.
- **OPPE-Like Readiness**: Be completely ready with your camera setup **before** the viva starts.
- **Strict 10-Minute Timer Integration**:
  > **WARNING**: Camera setup done after the viva has started will be counted under the 10-minute startup rule. If you fail to complete your setup and run your application within this time, you will be marked as **FAILED** (Level 1 viva). No rescheduling is provided.

---

## 2. Level 1 Viva Guidelines

1. **Duration**: Exactly **30 minutes** allocated to showcase your application. No additional time will be granted.
2. **Operational Rules**:
   - Must run the application without assistance within the first 10 minutes.
   - Demonstrate core functionalities of the project.
   - Answer 1–2 theoretical concepts.
   - Perform live code modifications requested by the proctor.
   - **GitHub Collaborator Check**: Students who have not created a GitHub repository or added the AppDev team as collaborators incur a **penalty of 6–7 marks** on their theory component.
3. **No Rescheduling**: Viva slots cannot be rescheduled due to high participant volume. Proctors evaluate based strictly on what is demonstrated within 30 minutes.
4. **Code Editor AI Prohibition**:
   - **Zero AI / LLM Tools Allowed**: Any AI/LLM extensions (e.g., GitHub Copilot, Cursor AI, Cody, Tabnine) active in the code editor during the viva are strictly prohibited.
5. **Report AI Disclosure**: If AI/LLMs were used during project development, the percentage and nature of usage must be disclosed in the project report.
6. **Notification Schedule**: Viva schedule emails are dispatched 12–24 hours prior to the slot. Join the Google Meet 10 minutes prior to your scheduled time.

---

## 3. Step-by-Step Preparation Checklist

| #   | Checklist Item          | Operational Instruction                                                                 | Strict Gate            |
| --- | ----------------------- | --------------------------------------------------------------------------------------- | ---------------------- |
| 1   | **Code Readiness**      | Project fully ready to execute locally without dependency delays.                       | Yes                    |
| 2   | **GitHub Profile**      | Open repository in browser showing commit history and AppDev team collaborators.        | Yes (6-7 mark penalty) |
| 3   | **Celery Timing**       | Configure task schedule intervals to short durations for immediate live demonstration.  | Yes                    |
| 4   | **Server Commands**     | Keep all terminal commands (Flask, Celery, Redis, frontend) pre-written in a text file. | Recommended            |
| 5   | **Student ID**          | Have official IITM student ID card open in a browser tab for immediate presentation.    | Yes                    |
| 6   | **Checksum Script**     | Validate project directory checksum locally using `check.py`.                           | Yes                    |
| 7   | **Avoid Debugging**     | Skip complex virtual environment debugging; ensure working dependencies beforehand.     | Recommended            |
| 8   | **Test Core Features**  | Ensure major features operate reliably. Any modification changes the checksum!          | Yes                    |
| 9   | **Venv / Node Modules** | Pre-install dependencies; you can reuse pre-built `.venv` and `node_modules` folders.   | Recommended            |

---

## 4. Verification Scripts

### Generate Checksum (`check.py`)

Run this script in the directory where your submission folder is unzipped:

```python
# check.py - Run in directory containing unzipped folder
import os
import sys

try:
    import checksumdir
except ImportError:
    print("Error: checksumdir not installed. Run: pip install checksumdir setuptools")
    sys.exit(1)

# Replace with your actual unzipped folder name
folder_name = "app_folder"
if not os.path.exists(folder_name):
    print(f"Error: {folder_name} not found.")
    sys.exit(1)

checksum = checksumdir.dirhash(folder_name)
print(f"Directory Checksum for {folder_name}: {checksum}")
```

### Programmatic Extraction for macOS Discrepancies (`unzip.py`)

If checksum mismatches occur due to operating system metadata (such as `__MACOSX` or hidden `.DS_Store` files), use this programmatic extraction script:

```python
# unzip.py - Programmatic clean extraction
from zipfile import ZipFile

# Replace with your submitted zip archive filename
zip_file = "project_submission.zip"

with ZipFile(zip_file, "r") as z:
    z.extractall("Unzipped")
print("Extracted successfully to Unzipped folder.")
```
