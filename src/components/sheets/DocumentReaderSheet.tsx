import React, { useState, useMemo } from "react";
import { marked } from "marked";
import { REFERENCE_DOCUMENTS } from "@/content";
import gradingPolicyRaw from "@/content/reference/grading-policy.md?raw";
import mad2ProjectVivaRaw from "@/content/reference/mad2-project-viva.md?raw";
import vivaPrepRaw from "@/content/reference/viva-preparation.md?raw";
import trekkingAppRaw from "@/content/reference/trekking-management-app.md?raw";
import examinationPortalRaw from "@/content/reference/examination-management-portal.md?raw";
import gitHelperRaw from "@/content/reference/git-helper-appdev.md?raw";
import tmaMilestonesRaw from "@/content/reference/tma-v2-milestones.md?raw";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, FileText, Search, CheckCircle2 } from "lucide-react";

interface DocumentReaderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDocumentId?: string | null;
}

const DOCUMENT_RAW_MAP: Record<string, string> = {
  "grading-policy": gradingPolicyRaw,
  "mad2-project-viva": mad2ProjectVivaRaw,
  "viva-preparation": vivaPrepRaw,
  "trekking-management-app": trekkingAppRaw,
  "examination-management-portal": examinationPortalRaw,
  "git-helper-appdev": gitHelperRaw,
  "tma-v2-milestones": tmaMilestonesRaw,
};

function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export const DocumentReaderSheet: React.FC<DocumentReaderSheetProps> = ({
  open,
  onOpenChange,
  initialDocumentId = null,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || "grading-policy");
  const [prevInitialId, setPrevInitialId] = useState(initialDocumentId);
  if (initialDocumentId !== prevInitialId) {
    setPrevInitialId(initialDocumentId);
    if (initialDocumentId && DOCUMENT_RAW_MAP[initialDocumentId]) {
      setSelectedDocId(initialDocumentId);
    }
  }
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentDocMeta = useMemo(() => {
    return REFERENCE_DOCUMENTS.find((d) => d.id === selectedDocId) || REFERENCE_DOCUMENTS[0];
  }, [selectedDocId]);

  const rawMarkdown = useMemo(() => {
    return DOCUMENT_RAW_MAP[selectedDocId] || "";
  }, [selectedDocId]);

  const contentWithoutFrontmatter = useMemo(() => {
    return stripFrontmatter(rawMarkdown);
  }, [rawMarkdown]);

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    return (contentWithoutFrontmatter.match(regex) || []).length;
  }, [contentWithoutFrontmatter, searchQuery]);

  // Parse HTML and highlight matches
  const parsedHtml = useMemo(() => {
    try {
      const html = marked.parse(contentWithoutFrontmatter, {
        gfm: true,
        breaks: true,
      }) as string;

      if (!searchQuery.trim()) return html;

      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Highlight matching text outside of HTML tag attributes
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, "gi");
      return html.replace(
        regex,
        `<mark class="bg-warning/30 text-foreground px-0.5 rounded font-medium">$1</mark>`,
      );
    } catch (e) {
      console.error("Failed to parse markdown:", e);
      return "<p>Error rendering document.</p>";
    }
  }, [contentWithoutFrontmatter, searchQuery]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface-100 border-l border-border-default text-foreground p-0 flex flex-col overflow-hidden"
        data-testid="document-reader-sheet"
      >
        {/* Sticky Header */}
        <SheetHeader className="p-5 sm:p-6 border-b border-border-default bg-surface-100/95 backdrop-blur-sm shrink-0 pr-10">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-brand font-mono text-sm font-semibold">
              <BookOpen className="size-4 text-brand" />
              <span>REFERENCE ARCHIVE</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono py-0 px-1.5 border-border-default"
            >
              {REFERENCE_DOCUMENTS.length} Authoritative Docs
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-mono py-0 px-1.5 border-success/30 text-success bg-success/10 flex items-center gap-1"
            >
              <CheckCircle2 className="size-3" />
              Verified Sept 18
            </Badge>
          </div>
          <SheetTitle className="text-xl sm:text-2xl font-semibold text-foreground text-balance">
            Official Course Documents
          </SheetTitle>
          <SheetDescription className="text-xs sm:text-sm text-foreground-light text-pretty">
            Verbatim source policies, grading formulas, project specifications, and viva protocols.
          </SheetDescription>
        </SheetHeader>

        {/* Document Selector Pills & In-Doc Search */}
        <div className="p-3 sm:p-4 border-b border-border-default bg-surface-200/50 flex flex-col gap-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {REFERENCE_DOCUMENTS.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setSearchQuery("");
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-brand/10 border-brand text-brand shadow-xs"
                      : "bg-surface-100 hover:bg-surface-200 border-border-default text-foreground-light"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                    <FileText className="size-3" />
                    {doc.category}
                  </span>
                  <span className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                    {doc.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box inside Current Document */}
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <Input
              aria-label="Search within document"
              placeholder={`Search within "${currentDocMeta.title.slice(0, 30)}..."`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-surface-100 border-border-default text-xs h-8"
            />
            {searchQuery.trim() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-foreground-lighter">
                {matchCount} {matchCount === 1 ? "match" : "matches"}
              </span>
            )}
          </div>

          {/* Current Doc Sub-metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-foreground-light">
              <span className="font-mono text-[11px] font-semibold text-foreground">Source:</span>
              <span className="font-mono text-[11px] text-foreground-lighter">
                {currentDocMeta.sourceFile}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-foreground-lighter">Related:</span>
              {currentDocMeta.relatedCourses.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1 border-border-default"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Rendered Document Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col gap-4">
          <div
            className="prose prose-invert max-w-none text-sm text-foreground leading-relaxed
              [&>h1]:text-lg [&>h1]:sm:text-xl [&>h1]:font-bold [&>h1]:text-foreground [&>h1]:pb-2 [&>h1]:border-b [&>h1]:border-border-default [&>h1]:mb-4
              [&>h2]:text-base [&>h2]:sm:text-lg [&>h2]:font-semibold [&>h2]:text-foreground [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:pt-2
              [&>h3]:text-sm [&>h3]:sm:text-base [&>h3]:font-semibold [&>h3]:text-brand [&>h3]:mt-4 [&>h3]:mb-2
              [&>p]:text-foreground-light [&>p]:mb-3 [&>p]:leading-relaxed
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5 [&>ul]:text-foreground-light [&>ul]:mb-4
              [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1.5 [&>ol]:text-foreground-light [&>ol]:mb-4
              [&>li]:leading-relaxed
              [&>blockquote]:border-l-2 [&>blockquote]:border-brand/60 [&>blockquote]:bg-surface-200/50 [&>blockquote]:pl-3.5 [&>blockquote]:py-1.5 [&>blockquote]:rounded-r [&>blockquote]:my-4 [&>blockquote]:text-foreground/90 [&>blockquote]:italic
              [&>table]:w-full [&>table]:border-collapse [&>table]:my-4 [&>table]:border [&>table]:border-border-default [&>table]:text-xs
              [&_th]:border [&_th]:border-border-default [&_th]:bg-surface-200 [&_th]:p-2 [&_th]:text-left [&_th]:font-mono [&_th]:font-semibold [&_th]:text-foreground
              [&_td]:border [&_td]:border-border-default [&_td]:p-2 [&_td]:text-foreground-light
              [&_code]:font-mono [&_code]:text-xs [&_code]:bg-surface-200 [&_code]:text-brand [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
              [&_pre]:bg-studio [&_pre]:border [&_pre]:border-border-default [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3
              [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-foreground/90
              [&>hr]:border-border-default [&>hr]:my-6
            "
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
