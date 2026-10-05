import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ResetConfirmDialog: React.FC<ResetConfirmDialogProps> = React.memo(
  function ResetConfirmDialog({ open, onOpenChange, onConfirm }) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-md bg-surface-100 border-border-default text-foreground font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance text-sm font-semibold">
              Reset Academic Records?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty text-xs text-foreground-light pt-1.5">
              This will clear all local assessment scores, SCT statuses, and project checklist
              progress back to the default empty semester template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer bg-surface-100 hover:bg-surface-200 border-border-default"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
                className="cursor-pointer"
              >
                Reset All Data
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);

ResetConfirmDialog.displayName = "ResetConfirmDialog";

export default ResetConfirmDialog;
