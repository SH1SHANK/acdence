import React, { useState, useMemo } from "react";
import type { SemesterTask, TaskStatus, TaskPriority } from "@/types/state";
import type { CourseCode } from "@/types/course";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckSquare,
} from "lucide-react";
import { formatAcademicDate } from "@/lib/datetime";

interface TaskBoardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: SemesterTask[];
  onAddTask: (task: Omit<SemesterTask, "id" | "createdAt"> & { id?: string }) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

const COURSES_LIST: Array<{ code: CourseCode | "GENERAL"; label: string }> = [
  { code: "GENERAL", label: "General" },
  { code: "CS2005", label: "CS2005" },
  { code: "SE2001", label: "SE2001" },
  { code: "CS2006", label: "CS2006" },
  { code: "CS2006P", label: "CS2006P" },
  { code: "MS2001", label: "MS2001" },
];

export const TaskBoardSheet: React.FC<TaskBoardSheetProps> = ({
  open,
  onOpenChange,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState<CourseCode | "GENERAL">("CS2006P");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedCourse === "all") return true;
      if (selectedCourse === "general") return !task.courseCode;
      return task.courseCode === selectedCourse;
    });
  }, [tasks, selectedCourse]);

  const todoTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "todo"),
    [filteredTasks],
  );
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "in_progress"),
    [filteredTasks],
  );
  const doneTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "done"),
    [filteredTasks],
  );

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      description: description.trim() || undefined,
      courseCode: courseCode === "GENERAL" ? undefined : (courseCode as CourseCode),
      priority,
      dueDate: dueDate.trim() || undefined,
      status: "todo",
    });

    // Reset form
    setTitle("");
    setDescription("");
    setDueDate("");
    setShowAddForm(false);
  };

  const completionPct =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
      : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface-100 border-l border-border-default text-foreground p-0 flex flex-col overflow-hidden"
        data-testid="task-board-sheet"
      >
        {/* Sticky Header */}
        <SheetHeader className="p-5 sm:p-6 border-b border-border-default bg-surface-100/95 backdrop-blur-sm shrink-0 pr-10">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-brand font-mono text-sm font-semibold">
              <CheckSquare className="size-4 text-brand" />
              <span>ACADEMIC TASKS</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono py-0 px-1.5 border-border-default"
            >
              {tasks.length} Total Tasks
            </Badge>
            <Badge
              variant="brand"
              className="text-xs font-mono py-0 px-1.5 flex items-center gap-1 tabular-nums"
            >
              <CheckCircle2 className="size-3" />
              {completionPct}% Done
            </Badge>
          </div>
          <SheetTitle className="text-xl sm:text-2xl font-semibold font-heading text-foreground text-balance">
            Semester Action Board
          </SheetTitle>
          <SheetDescription className="text-xs sm:text-sm text-foreground-light text-pretty">
            Track weekly assignments, OPPE readiness, project milestones, and viva action items.
          </SheetDescription>
        </SheetHeader>

        {/* Filter and Add Bar */}
        <div className="p-3 sm:p-4 border-b border-border-default bg-surface-200/40 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Course Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCourse("all")}
                aria-pressed={selectedCourse === "all"}
                className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  selectedCourse === "all"
                    ? "bg-brand text-black font-semibold shadow-xs"
                    : "bg-surface-200 hover:bg-surface-300 text-foreground-light border border-border-default"
                }`}
              >
                All
              </button>
              {COURSES_LIST.map((c) => {
                const isSelected =
                  (c.code === "GENERAL" && selectedCourse === "general") ||
                  selectedCourse === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCourse(c.code === "GENERAL" ? "general" : c.code)}
                    aria-pressed={isSelected}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brand text-black font-semibold shadow-xs"
                        : "bg-surface-200 hover:bg-surface-300 text-foreground-light border border-border-default"
                    }`}
                  >
                    {c.code}
                  </button>
                );
              })}
            </div>

            <Button
              variant={showAddForm ? "outline" : "primary"}
              size="small"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="size-3.5" />
              <span>{showAddForm ? "Cancel" : "New Task"}</span>
            </Button>
          </div>

          {/* Inline Add Task Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateTask}
              className="p-3 bg-surface-100 rounded-lg border border-border-default flex flex-col gap-3 animate-in fade-in-50 duration-150"
            >
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="task-title"
                  className="text-[11px] font-mono text-foreground-lighter"
                >
                  TASK TITLE
                </Label>
                <Input
                  id="task-title"
                  placeholder="e.g. Write Celery periodic batch job for monthly report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-surface-200 border-border-default text-xs h-8 text-foreground"
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="task-desc"
                  className="text-[11px] font-mono text-foreground-lighter"
                >
                  DESCRIPTION (OPTIONAL)
                </Label>
                <Input
                  id="task-desc"
                  placeholder="Details, acceptance criteria, or links..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-surface-200 border-border-default text-xs h-8 text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="task-course"
                    className="text-[10px] font-mono text-foreground-lighter"
                  >
                    COURSE
                  </Label>
                  <Select value={courseCode} onValueChange={(val) => setCourseCode(val as any)}>
                    <SelectTrigger
                      id="task-course"
                      className="h-8 bg-surface-200 border-border-default text-xs"
                    >
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General / Term</SelectItem>
                      <SelectItem value="CS2005">CS2005</SelectItem>
                      <SelectItem value="SE2001">SE2001</SelectItem>
                      <SelectItem value="CS2006">CS2006</SelectItem>
                      <SelectItem value="CS2006P">CS2006P</SelectItem>
                      <SelectItem value="MS2001">MS2001</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="task-priority"
                    className="text-[10px] font-mono text-foreground-lighter"
                  >
                    PRIORITY
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={(val) => setPriority(val as TaskPriority)}
                  >
                    <SelectTrigger
                      id="task-priority"
                      className="h-8 bg-surface-200 border-border-default text-xs capitalize"
                    >
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="task-due-date"
                    className="text-[10px] font-mono text-foreground-lighter"
                  >
                    DUE DATE
                  </Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-surface-200 border-border-default text-xs h-8 font-mono text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small">
                  Create Task
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 3-Column Kanban Board */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {/* Column 1: To Do */}
            <div className="flex flex-col rounded-lg border border-border-default bg-surface-100 p-3 gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-border-default">
                <div className="flex items-center gap-1.5">
                  <Circle className="size-3.5 text-foreground-lighter" />
                  <span className="font-mono text-xs font-bold text-foreground">TO DO</span>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1.5 border-border-default tabular-nums"
                >
                  {todoTasks.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {todoTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-lighter font-mono">
                    No tasks in queue.
                  </div>
                ) : (
                  todoTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onUpdateStatus={onUpdateTaskStatus}
                      onDelete={onDeleteTask}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="flex flex-col rounded-lg border border-border-default bg-surface-100 p-3 gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-border-default">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-warning" />
                  <span className="font-mono text-xs font-bold text-foreground">IN PROGRESS</span>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1.5 border-border-default tabular-nums text-foreground-light"
                >
                  {inProgressTasks.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {inProgressTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-lighter font-mono">
                    Nothing actively in progress.
                  </div>
                ) : (
                  inProgressTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onUpdateStatus={onUpdateTaskStatus}
                      onDelete={onDeleteTask}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="flex flex-col rounded-lg border border-brand/30 bg-surface-100 p-3 gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-border-default">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-brand" />
                  <span className="font-mono text-xs font-bold text-brand">DONE</span>
                </div>
                <Badge variant="brand" className="font-mono text-[10px] py-0 px-1.5 tabular-nums">
                  {doneTasks.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {doneTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-foreground-lighter font-mono">
                    No completed tasks yet.
                  </div>
                ) : (
                  doneTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onUpdateStatus={onUpdateTaskStatus}
                      onDelete={onDeleteTask}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface TaskCardProps {
  task: SemesterTask;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onDelete }) => {
  return (
    <div className="p-3 bg-surface-200/70 rounded-lg border border-border-default shadow-xs flex flex-col gap-2 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {task.courseCode ? (
            <Badge
              variant="outline"
              className="font-mono text-[10px] py-0 px-1.5 border-border-default font-semibold text-brand bg-brand/5"
            >
              {task.courseCode}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="font-mono text-[10px] py-0 px-1 border-border-default text-foreground-lighter"
            >
              General
            </Badge>
          )}

          <Badge
            variant={
              task.priority === "high"
                ? "destructive"
                : task.priority === "medium"
                  ? "warning"
                  : "secondary"
            }
            className="font-mono text-[10px] py-0 px-1.5 capitalize"
          >
            {task.priority}
          </Badge>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="text-foreground-lighter hover:text-destructive p-1 rounded transition-colors cursor-pointer"
              title={`Delete task: ${task.title}`}
              aria-label={`Delete task: ${task.title}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong className="text-foreground">"{task.title}"</strong>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={() => onDelete(task.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div>
        <p
          className={`text-xs font-medium text-foreground leading-snug ${task.status === "done" ? "line-through opacity-70" : ""}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-foreground-light leading-relaxed mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {task.dueDate && (
        <div className="flex items-center gap-1 text-[10px] font-mono text-foreground-lighter pt-0.5">
          <Clock className="size-3" />
          <span>Due: {formatAcademicDate(task.dueDate, true)}</span>
        </div>
      )}

      {/* Action Row */}
      <div className="pt-2 border-t border-border-default/60 flex items-center justify-between gap-1">
        {task.status === "todo" && (
          <>
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "in_progress")}
              className="text-[11px] font-mono text-foreground-light hover:text-foreground flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-surface-300 transition-colors cursor-pointer"
            >
              Start <ArrowRight className="size-2.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "done")}
              className="text-[11px] font-mono text-brand hover:underline flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-brand/10 transition-colors cursor-pointer font-medium"
            >
              Done <Check className="size-2.5" />
            </button>
          </>
        )}

        {task.status === "in_progress" && (
          <>
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "todo")}
              className="text-[11px] font-mono text-foreground-light hover:text-foreground flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-surface-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-2.5" /> To Do
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "done")}
              className="text-[11px] font-mono text-brand hover:underline flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-brand/10 transition-colors cursor-pointer font-semibold"
            >
              Done <Check className="size-2.5" />
            </button>
          </>
        )}

        {task.status === "done" && (
          <button
            type="button"
            onClick={() => onUpdateStatus(task.id, "todo")}
            className="text-[11px] font-mono text-foreground-light hover:text-foreground flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-surface-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-2.5" /> Reopen
          </button>
        )}
      </div>
    </div>
  );
};
