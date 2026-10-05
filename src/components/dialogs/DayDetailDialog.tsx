import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AcademicEvent } from "@/types/events";
import type { CourseCode } from "@/types/course";

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLabel: string;
  selectedEvents: AcademicEvent[];
  onSelectCourse?: (courseCode: CourseCode) => void;
  onClose: () => void;
}

const compactTitle = (event: AcademicEvent) =>
  event.title
    .replace(
      /September 2026 Term |End Term Exam \(In-Centre\)|\(In-Centre\)|\(Online Proctored\)/g,
      "",
    )
    .trim();

const eventLabel = (event: AcademicEvent) =>
  event.hardCutoff || event.isHardCutoff
    ? "Hard Cutoff"
    : event.type === "exam" || event.type === "viva"
      ? "Exam/Viva"
      : event.type === "assignment" || event.type === "bpt_deadline"
        ? "Assignment"
        : event.type.startsWith("project")
          ? "Project"
          : "Academic deadline";

const eventTone = (event: AcademicEvent) =>
  event.hardCutoff || event.isHardCutoff
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : event.type === "exam" || event.type === "viva"
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-border-default/70 bg-surface-200/30 text-foreground-light";

export const DayDetailDialog: React.FC<DayDetailDialogProps> = React.memo(function DayDetailDialog({
  open,
  onOpenChange,
  selectedLabel,
  selectedEvents,
  onSelectCourse,
  onClose,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-balance">{selectedLabel}</DialogTitle>
          <DialogDescription className="text-pretty tabular-nums">
            {selectedEvents.length} academic event{selectedEvents.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] flex flex-col gap-2 overflow-y-auto">
          {selectedEvents.map((event) => (
            <div key={event.id} className={`rounded-lg border-l-2 p-3 ${eventTone(event)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-semibold uppercase">
                    {event.courseCode || eventLabel(event)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {compactTitle(event)}
                  </div>
                  <div className="mt-1 text-xs text-foreground-lighter">
                    {event.time || "Due date event"}
                  </div>
                </div>
                {event.courseCode && onSelectCourse && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectCourse(event.courseCode as CourseCode)}
                  >
                    Open Course
                  </Button>
                )}
              </div>
              {event.description && (
                <p className="mt-2 border-t border-border-default/40 pt-2 text-pretty text-xs leading-relaxed text-foreground-light">
                  {event.description}
                </p>
              )}
            </div>
          ))}
          {selectedEvents.length === 0 && (
            <div className="py-8 text-center flex flex-col items-center gap-3">
              <p className="text-pretty text-sm text-foreground-light">
                Nothing scheduled for this day.
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

DayDetailDialog.displayName = "DayDetailDialog";

export default DayDetailDialog;
