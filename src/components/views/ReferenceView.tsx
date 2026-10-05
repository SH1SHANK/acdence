import React, { useState, useMemo } from "react";
import { marked } from "marked";
import { LayoutDashboard, Search, CheckCircle2, BookMarked } from "lucide-react";
import { PageContainer } from "@/components/fragments/PageContainer";
import {
  PageHeader,
  PageHeaderMeta,
  PageHeaderIcon,
  PageHeaderSummary,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/fragments/PageHeader";
import {
  PageSection,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
  PageSectionDescription,
  PageSectionAside,
  PageSectionContent,
} from "@/components/fragments/PageSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REFERENCE_DOCUMENTS } from "@/content";
import gradingPolicyRaw from "@/content/reference/grading-policy.md?raw";
import mad2ProjectVivaRaw from "@/content/reference/mad2-project-viva.md?raw";
import vivaPrepRaw from "@/content/reference/viva-preparation.md?raw";
import trekkingAppRaw from "@/content/reference/trekking-management-app.md?raw";
import examinationPortalRaw from "@/content/reference/examination-management-portal.md?raw";
import gitHelperRaw from "@/content/reference/git-helper-appdev.md?raw";
import tmaMilestonesRaw from "@/content/reference/tma-v2-milestones.md?raw";

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

export interface ReferenceViewProps {
  initialDocumentId?: string | null;
  onNavigateToDashboard?: () => void;
}

export const ReferenceView: React.FC<ReferenceViewProps> = React.memo(function ReferenceView({
  initialDocumentId = "grading-policy",
  onNavigateToDashboard,
}) {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || "grading-policy");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentDocMeta = useMemo(() => {
    return REFERENCE_DOCUMENTS.find((d) => d.id === selectedDocId) || REFERENCE_DOCUMENTS[0];
  }, [selectedDocId]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return REFERENCE_DOCUMENTS;
    const q = searchQuery.toLowerCase();
    return REFERENCE_DOCUMENTS.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.relatedCourses.some((c) => c.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const htmlContent = useMemo(() => {
    const raw = DOCUMENT_RAW_MAP[currentDocMeta.id] || "";
    const clean = stripFrontmatter(raw);
    try {
      return marked.parse(clean) as string;
    } catch {
      return "<p>Error rendering document content.</p>";
    }
  }, [currentDocMeta.id]);

  return (
    <PageContainer size="large">
      {/* 1. Page Header */}
      <PageHeader>
        <PageHeaderMeta>
          <PageHeaderIcon>
            <BookMarked className="size-5 text-brand" />
          </PageHeaderIcon>
          <PageHeaderSummary>
            <PageHeaderTitle>Official Reference Documents</PageHeaderTitle>
            <PageHeaderDescription>
              September 2026 Term · Canonical IIT Madras Policies, Grading Rules & MAD2 Guidelines
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>

        {onNavigateToDashboard && (
          <PageHeaderActions>
            <Button
              variant="outline"
              size="small"
              onClick={onNavigateToDashboard}
              className="gap-1.5"
            >
              <LayoutDashboard className="size-3.5 text-brand" />
              <span>Dashboard</span>
            </Button>
          </PageHeaderActions>
        )}
      </PageHeader>

      {/* 2. Main Two-Column Document Browser */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Document Selection List */}
        <div className="md:col-span-4 flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 size-3.5 text-foreground-lighter" />
            <Input
              type="text"
              placeholder="Filter documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-surface-100 border-border-default focus-visible:border-brand"
            />
          </div>

          <div className="rounded-lg border border-border-default bg-surface-100 divide-y divide-border-default overflow-hidden">
            {filteredDocs.map((doc) => {
              const isSelected = doc.id === currentDocMeta.id;

              return (
                <button
                  key={doc.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full p-3.5 text-left flex flex-col gap-1 transition-colors border-l-2 cursor-pointer ${
                    isSelected
                      ? "bg-surface-200 border-brand"
                      : "border-transparent hover:bg-surface-200/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-brand" : "text-foreground"
                      }`}
                    >
                      {doc.title}
                    </span>
                    <Badge variant="secondary" className="text-[9px] uppercase font-mono">
                      {doc.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-foreground-lighter line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document Viewer using PageSection */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <PageSection>
            <PageSectionMeta>
              <PageSectionSummary>
                <PageSectionTitle>{currentDocMeta.title}</PageSectionTitle>
                <PageSectionDescription>
                  Source: {currentDocMeta.sourceFile} · Verified: {currentDocMeta.lastVerified}
                </PageSectionDescription>
              </PageSectionSummary>

              <PageSectionAside>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentDocMeta.relatedCourses.map((c) => (
                    <Badge key={c} variant="outline" className="font-mono text-[10px]">
                      {c}
                    </Badge>
                  ))}
                  <span className="flex items-center gap-1 text-[11px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                    <CheckCircle2 className="size-3" />
                    Verified
                  </span>
                </div>
              </PageSectionAside>
            </PageSectionMeta>

            <PageSectionContent>
              <div className="rounded-lg border border-border-default bg-surface-100 p-4 sm:p-6 overflow-x-auto touch-pan-x scrollbar-thin">
                <article
                  className="prose prose-invert prose-emerald max-w-none text-foreground leading-relaxed text-sm [&_h1]:text-xl [&_h1]:font-bold [&_h1]:font-heading [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:font-heading [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-4 [&_p]:text-foreground-light [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:text-foreground-light [&_code]:bg-surface-200 [&_code]:text-brand [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_pre]:bg-surface-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-border-default [&_th]:p-2 [&_th]:text-left [&_th]:text-foreground-lighter [&_th]:font-mono [&_th]:text-xs [&_td]:border-b [&_td]:border-border-default/60 [&_td]:p-2 [&_td]:text-foreground-light [&_td]:text-xs"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            </PageSectionContent>
          </PageSection>
        </div>
      </div>
    </PageContainer>
  );
});
