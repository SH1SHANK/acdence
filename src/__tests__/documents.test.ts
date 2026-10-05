import { describe, it, expect } from "vite-plus/test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  REFERENCE_DOCUMENTS,
  getAllDocuments,
  getDocumentById,
  getDocumentsForCourse,
  getDocumentsByCategory,
} from "@/content/index";

describe("Reference Document Registry & Markdown Content Foundation", () => {
  const projectRoot = process.cwd();

  describe("Registry Integrity", () => {
    it("contains all 7 required reference documents", () => {
      const docs = getAllDocuments();
      expect(docs.length).toBe(7);

      const ids = docs.map((d) => d.id);
      expect(ids).toContain("grading-policy");
      expect(ids).toContain("mad2-project-viva");
      expect(ids).toContain("viva-preparation");
      expect(ids).toContain("trekking-management-app");
      expect(ids).toContain("examination-management-portal");
      expect(ids).toContain("git-helper-appdev");
      expect(ids).toContain("tma-v2-milestones");
    });

    it("ensures every document definition has complete metadata attributes", () => {
      for (const doc of REFERENCE_DOCUMENTS) {
        expect(doc.id.trim().length).toBeGreaterThan(0);
        expect(doc.title.trim().length).toBeGreaterThan(0);
        expect(doc.description.trim().length).toBeGreaterThan(0);
        expect(doc.file.endsWith(".md")).toBe(true);
        expect(["grading", "project", "viva", "reference"]).toContain(doc.category);
        expect(doc.relatedCourses.length).toBeGreaterThan(0);
        expect(doc.sourceFile.length).toBeGreaterThan(0);
        expect(doc.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe("File Existence on Disk", () => {
    it("verifies every registered Markdown file exists and is non-empty", () => {
      for (const doc of REFERENCE_DOCUMENTS) {
        const fullPath = path.resolve(projectRoot, doc.file);
        expect(fs.existsSync(fullPath)).toBe(true);

        const stat = fs.statSync(fullPath);
        expect(stat.isFile()).toBe(true);
        // Ensure documents contain substantive source content (> 1000 bytes)
        expect(stat.size).toBeGreaterThan(1000);
      }
    });
  });

  describe("Frontmatter & Metadata Validity", () => {
    it("verifies all Markdown files start with valid YAML frontmatter matching specifications", () => {
      for (const doc of REFERENCE_DOCUMENTS) {
        const fullPath = path.resolve(projectRoot, doc.file);
        const content = fs.readFileSync(fullPath, "utf-8");

        // Must start with frontmatter markers
        expect(content.startsWith("---\n")).toBe(true);
        const secondDelim = content.indexOf("\n---\n", 4);
        expect(secondDelim).toBeGreaterThan(4);

        const frontmatter = content.slice(4, secondDelim);
        expect(frontmatter).toContain("title:");
        expect(frontmatter).toContain("sourceType: pdf");
        expect(frontmatter).toContain("sourceFile:");
        expect(frontmatter).toContain("course:");
        expect(frontmatter).toContain("lastVerified:");
      }
    });
  });

  describe("Registry Query Helpers", () => {
    it("retrieves documents by ID", () => {
      const gradingDoc = getDocumentById("grading-policy");
      expect(gradingDoc).toBeDefined();
      expect(gradingDoc?.title).toContain("Course Grading System Guidelines");

      const unknownDoc = getDocumentById("non-existent-doc");
      expect(unknownDoc).toBeUndefined();
    });

    it("filters documents by course", () => {
      const mad2Docs = getDocumentsForCourse("CS2006P");
      expect(mad2Docs.length).toBe(7);
      const ids = mad2Docs.map((d) => d.id);
      expect(ids).toContain("grading-policy");
      expect(ids).toContain("mad2-project-viva");
      expect(ids).toContain("viva-preparation");
      expect(ids).toContain("trekking-management-app");
      expect(ids).toContain("examination-management-portal");
      expect(ids).toContain("git-helper-appdev");
      expect(ids).toContain("tma-v2-milestones");
    });

    it("filters documents by category", () => {
      const projectDocs = getDocumentsByCategory("project");
      expect(projectDocs.length).toBe(3);
      const vivaDocs = getDocumentsByCategory("viva");
      expect(vivaDocs.length).toBe(1);
      const gradingDocs = getDocumentsByCategory("grading");
      expect(gradingDocs.length).toBe(1);
      const referenceDocs = getDocumentsByCategory("reference");
      expect(referenceDocs.length).toBe(2);
    });
  });
});
