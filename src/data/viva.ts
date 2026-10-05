import type { VivaChecklistItem, VivaEnvironmentRule } from "@/types/viva";
import { VIVA_CHECKLIST_METADATA, MAD2_PROJECT_INSTRUCTIONS_METADATA } from "./metadata";

export const VIVA_CHECKLIST: VivaChecklistItem[] = [
  // Hardware & Camera Setup
  {
    id: "viva_check_dual_camera",
    category: "hardware_setup",
    title: "Dual Device & Camera Positioning",
    description:
      "Join Google Meet from PC and Phone. Phone positioned showing hands, face, and laptop screen. One device muted.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_camera_preconfigured",
    category: "hardware_setup",
    title: "Setup Ready Before Meet Start",
    description:
      "Camera setup must be fully arranged before the meet. Setting up after join is counted against the 10-minute timer!",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_audio_screen",
    category: "hardware_setup",
    title: "Mic & Screen-Sharing Verification",
    description: "Test microphone, camera, and full screen-sharing permissions before joining.",
    isStrictGate: false,
    source: VIVA_CHECKLIST_METADATA,
  },

  // 10-Minute Rule & Runtime Execution
  {
    id: "viva_check_ten_minute_execution",
    category: "preparation_execution",
    title: "Run Application Within 10 Minutes",
    description:
      "Application must be up and running locally within 10 minutes of checksum verification. Proctor assistance not allowed.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_server_commands",
    category: "preparation_execution",
    title: "Server Commands Text File Prepared",
    description:
      "Keep all startup commands (Flask, Celery worker, Celery beat, Redis, frontend dev server) in a text file for instant pasting.",
    isStrictGate: false,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_venv_preinstalled",
    category: "preparation_execution",
    title: "Dependencies Pre-Installed",
    description:
      "Pre-create python venv and install node_modules beforehand. Do NOT install packages during viva.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_celery_timings",
    category: "preparation_execution",
    title: "Celery Task Timing Verified",
    description:
      "Configure Celery beat schedule timings to short intervals (e.g. 10-30s) so batch jobs can be demonstrated live.",
    isStrictGate: false,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_checksum_script",
    category: "preparation_execution",
    title: "Directory Checksum Tested Locally",
    description:
      "Validate submission folder hash with dirhash check.py beforehand. Prepare unzip.py script in case of OS archive discrepancies.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },

  // Rules & Authenticity
  {
    id: "viva_check_github_collaborator",
    category: "rules_environment",
    title: "GitHub Repository & Collaborator Added",
    description:
      "Ensure GitHub repo has commit history and AppDev team added as collaborators. Missing collaborator penalizes 6-7 theory marks.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_no_ai_editor",
    category: "rules_environment",
    title: "Zero AI / LLM Extensions in Code Editor",
    description:
      "Disable GitHub Copilot, Cursor AI, or any inline AI completion plugins in the code editor during viva. Strictly prohibited.",
    isStrictGate: true,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_id_card",
    category: "rules_environment",
    title: "Student ID Card Ready in Browser Tab",
    description:
      "Keep official IITM student ID card open in browser tab for instant verification at start.",
    isStrictGate: false,
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "viva_check_code_modification_ready",
    category: "preparation_execution",
    title: "Live Code Modification Preparation",
    description:
      "Be prepared to make live logic edits, alter database queries, or adjust routes requested by the examiner.",
    isStrictGate: true,
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
];

export const VIVA_ENVIRONMENT_RULES: VivaEnvironmentRule[] = [
  {
    id: "rule_ten_min",
    rule: "Failure to run application within 10 minutes of checksum verification.",
    penalty: "Immediate Level 1 viva failure (U grade). No rescheduling.",
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "rule_dual_cam",
    rule: "Failure to arrange dual-camera setup (hands, face, screen visible).",
    penalty: "Setup time consumes the 10-minute startup window. Viva cancelled if not completed.",
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "rule_ai_editor",
    rule: "Active AI / LLM plugins in code editor during viva.",
    penalty: "Disqualification and referral to Disciplinary Web Committee (DWC) for malpractice.",
    source: VIVA_CHECKLIST_METADATA,
  },
  {
    id: "rule_conduct",
    rule: "Rude, argumentative, or disrespectful conduct towards examiners.",
    penalty: "Immediate removal from viva, U grade awarded, and reported to DWC.",
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
  {
    id: "rule_authenticity",
    rule: "Inability to answer basic questions on submitted code.",
    penalty:
      "Flagged for malpractice (mismatch between complexity and understanding). U grade in course.",
    source: MAD2_PROJECT_INSTRUCTIONS_METADATA,
  },
];

export const PYTHON_CHECKSUM_SCRIPT = `# check.py - Run in directory where submission folder is unzipped
import os
import sys

try:
    import checksumdir
except ImportError:
    print("Error: checksumdir not installed. Run: pip install checksumdir setuptools")
    sys.exit(1)

# Replace with exact unzipped folder name
folder_name = "project_submission"
if not os.path.exists(folder_name):
    print(f"Error: {folder_name} not found in current directory.")
    sys.exit(1)

computed_hash = checksumdir.dirhash(folder_name)
print(f"Directory Checksum for {folder_name}: {computed_hash}")
`;

export const PYTHON_UNZIP_SCRIPT = `# unzip.py - Programmatic unzipper to prevent macOS metadata corruption
import os
from zipfile import ZipFile

zip_filename = "project_submission.zip"
target_dir = "Unzipped"

if not os.path.exists(zip_filename):
    print(f"Error: {zip_filename} not found.")
else:
    with ZipFile(zip_filename, "r") as z:
        z.extractall(target_dir)
    print(f"Extracted successfully to {target_dir}/")
`;
