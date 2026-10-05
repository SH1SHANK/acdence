import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PersistedUserState } from "@/types/state";
import { exportStateAsJson } from "@/lib/persistence";
import { FolderDown, FolderUp, Copy, Check, Download, AlertCircle, FileCheck } from "lucide-react";

interface DataBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PersistedUserState;
  onImportState: (jsonString: string) => void;
  initialTab?: "export" | "import";
}

export const DataBackupDialog: React.FC<DataBackupDialogProps> = ({
  open,
  onOpenChange,
  state,
  onImportState,
  initialTab = "export",
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">(initialTab);
  const [prevOpenState, setPrevOpenState] = useState({ open, initialTab });

  if (open !== prevOpenState.open || initialTab !== prevOpenState.initialTab) {
    setPrevOpenState({ open, initialTab });
    if (open) {
      setActiveTab(initialTab);
    }
  }
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => (open ? exportStateAsJson(state) : ""), [open, state]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iitm_sep2026_state_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      setImportError(null);
    };
    reader.readAsText(file);
  };

  const handleDoImport = () => {
    setImportError(null);
    setImportSuccess(false);
    if (!importJsonText.trim()) {
      setImportError("Please paste or upload valid JSON before restoring.");
      return;
    }

    try {
      onImportState(importJsonText.trim());
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || "Failed to parse and restore state from JSON.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg bg-surface-100 border-border-default text-foreground p-0 overflow-hidden shadow-2xl"
        data-testid="data-backup-dialog"
      >
        <DialogHeader className="p-5 border-b border-border-default bg-surface-200/40">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded bg-brand/10 text-brand">
              <FolderDown className="size-4" />
            </div>
            <DialogTitle className="text-balance text-base font-semibold">
              State Backup & Restoration
            </DialogTitle>
          </div>
          <DialogDescription className="text-pretty text-xs text-foreground-light">
            Save or restore all marks, viva checklists, and tasks with zero cloud reliance.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-default bg-surface-200/50 px-5 pt-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("export");
              setImportError(null);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "export"
                ? "border-brand text-brand font-bold"
                : "border-transparent text-foreground-lighter hover:text-foreground"
            }`}
          >
            <FolderDown className="size-3.5" />
            Export State
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("import");
              setImportError(null);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "import"
                ? "border-brand text-brand font-bold"
                : "border-transparent text-foreground-lighter hover:text-foreground"
            }`}
          >
            <FolderUp className="size-3.5" />
            Restore / Import
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {activeTab === "export" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-lighter font-mono tabular-nums">
                  Schema v{state.schemaVersion} · Last Saved:{" "}
                  {new Date(state.updatedAt).toLocaleTimeString()}
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1 border-border-default text-foreground-lighter"
                >
                  Ready to Export
                </Badge>
              </div>

              <textarea
                readOnly
                aria-label="Exported user state JSON"
                value={jsonString}
                className="w-full h-48 bg-surface-100 border border-border-default rounded-md p-3 font-mono text-[11px] text-foreground-light resize-none focus:outline-hidden"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className={`text-xs h-8 transition-colors cursor-pointer ${
                    copied
                      ? "border-border-default bg-surface-200 text-foreground font-medium"
                      : "hover:bg-surface-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check
                        data-icon="inline-start"
                        className="text-foreground animate-in zoom-in-50"
                      />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy data-icon="inline-start" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs h-8 transition-colors shadow-xs cursor-pointer"
                >
                  <Download data-icon="inline-start" />
                  <span>Download .json</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-pretty text-xs text-foreground-light leading-relaxed">
                Paste JSON state below or upload a previously exported{" "}
                <code className="font-mono text-brand">.json</code> file to restore your academic
                state.
              </p>

              <div className="p-3 border border-dashed border-border-default hover:border-brand/50 rounded-lg bg-surface-200/30 flex flex-col sm:flex-row items-center justify-between gap-2 transition-colors">
                <div className="flex items-center gap-2 text-xs text-foreground-light">
                  <FolderUp className="size-4 text-brand shrink-0" />
                  <span>Upload local backup file:</span>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Upload backup JSON file"
                  onChange={handleFileUpload}
                  className="text-xs text-foreground-light file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-border-default file:text-xs file:bg-surface-200 file:text-foreground file:cursor-pointer hover:file:bg-surface-300 transition-colors"
                />
              </div>

              <textarea
                value={importJsonText}
                aria-label="Paste user state JSON"
                onChange={(e) => {
                  setImportJsonText(e.target.value);
                  setImportError(null);
                }}
                placeholder="Or paste raw PersistedUserState JSON string here..."
                className="w-full h-32 bg-surface-100 border border-border-default focus:border-brand focus:ring-1 focus:ring-brand rounded-md p-3 font-mono text-[11px] text-foreground resize-none focus:outline-hidden transition-all"
              />

              {importError && (
                <div className="p-2.5 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-2.5 rounded bg-surface-200/50 border border-border-default text-foreground text-xs flex items-center gap-2">
                  <FileCheck className="size-4 shrink-0" />
                  <span>State successfully restored! Refreshing...</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDoImport}
                  className="text-xs h-8 cursor-pointer"
                >
                  <FolderUp className="size-3.5 mr-1.5" />
                  <span>Restore Data</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
