import { describe, it, expect } from "vite-plus/test";
import { calculateStandardGrade, roundToTwo } from "@/grading/utils";

describe("Grade threshold boundaries", () => {
  // S grade: >= 90
  it("evaluates S threshold (90) boundaries correctly", () => {
    expect(calculateStandardGrade(90.0)).toBe("S");
    expect(calculateStandardGrade(90.01)).toBe("S");
    expect(calculateStandardGrade(100.0)).toBe("S");
    expect(calculateStandardGrade(89.99)).toBe("A");
    expect(calculateStandardGrade(89.994)).toBe("A");
  });

  // A grade: >= 80 and < 90
  it("evaluates A threshold (80) boundaries correctly", () => {
    expect(calculateStandardGrade(80.0)).toBe("A");
    expect(calculateStandardGrade(80.01)).toBe("A");
    expect(calculateStandardGrade(89.9)).toBe("A");
    expect(calculateStandardGrade(79.99)).toBe("B");
  });

  // B grade: >= 70 and < 80
  it("evaluates B threshold (70) boundaries correctly", () => {
    expect(calculateStandardGrade(70.0)).toBe("B");
    expect(calculateStandardGrade(70.01)).toBe("B");
    expect(calculateStandardGrade(79.9)).toBe("B");
    expect(calculateStandardGrade(69.99)).toBe("C");
  });

  // C grade: >= 60 and < 70
  it("evaluates C threshold (60) boundaries correctly", () => {
    expect(calculateStandardGrade(60.0)).toBe("C");
    expect(calculateStandardGrade(60.01)).toBe("C");
    expect(calculateStandardGrade(69.9)).toBe("C");
    expect(calculateStandardGrade(59.99)).toBe("D");
  });

  // D grade: >= 50 and < 60
  it("evaluates D threshold (50) boundaries correctly", () => {
    expect(calculateStandardGrade(50.0)).toBe("D");
    expect(calculateStandardGrade(50.01)).toBe("D");
    expect(calculateStandardGrade(59.9)).toBe("D");
    expect(calculateStandardGrade(49.99)).toBe("E");
  });

  // E grade: >= 40 and < 50
  it("evaluates E threshold (40) boundaries correctly", () => {
    expect(calculateStandardGrade(40.0)).toBe("E");
    expect(calculateStandardGrade(40.01)).toBe("E");
    expect(calculateStandardGrade(49.9)).toBe("E");
    expect(calculateStandardGrade(39.99)).toBe("U");
    expect(calculateStandardGrade(39.999)).toBe("U");
  });

  // U grade: < 40
  it("evaluates U threshold (< 40) boundaries correctly", () => {
    expect(calculateStandardGrade(0)).toBe("U");
    expect(calculateStandardGrade(20)).toBe("U");
    expect(calculateStandardGrade(39.9)).toBe("U");
  });

  // Null input
  it("returns null for null score", () => {
    expect(calculateStandardGrade(null)).toBeNull();
  });
});

describe("Rounding at output boundaries", () => {
  it("rounds presentation numbers without premature distortion", () => {
    expect(roundToTwo(39.995)).toBe(40.0);
    expect(roundToTwo(39.994)).toBe(39.99);
    expect(roundToTwo(89.995)).toBe(90.0);
    expect(roundToTwo(89.994)).toBe(89.99);
    expect(roundToTwo(1.005)).toBe(1.01);
    expect(roundToTwo(0)).toBe(0);
    expect(roundToTwo(100)).toBe(100);
  });
});
