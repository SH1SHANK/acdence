import React from "react";
import type { CourseCode } from "@/types/course";
import type { AssessmentRecord } from "@/types/assessment";
import type { GradeCalculationResult } from "@/types/grading";
import { CourseCard } from "./CourseCard";
import { COURSES } from "@/data/courses";

interface CourseGridProps {
  courseGrades: Record<CourseCode, GradeCalculationResult | null>;
  todayDate: string;
  records: Record<string, AssessmentRecord>;
  onUpdateAssessment: (id: string, updates: Partial<AssessmentRecord>) => void;
  onOpenDetail?: (courseCode: CourseCode) => void;
}

const THEORY_COURSE_CODES: CourseCode[] = ["CS2005", "SE2001", "CS2006", "MS2001"];

export const CourseGrid: React.FC<CourseGridProps> = ({
  courseGrades,
  todayDate,
  records,
  onUpdateAssessment,
  onOpenDetail,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-balance text-base font-semibold tracking-tight text-foreground">
            Theory Courses (4)
          </h2>
          <p className="text-pretty text-xs text-foreground-light">
            Live scores, exam marks, and the next action
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THEORY_COURSE_CODES.map((code) => {
          const course = COURSES[code];
          const gradeResult = courseGrades[code];
          return (
            <div key={code}>
              <CourseCard
                course={course}
                gradeResult={gradeResult}
                records={records}
                todayDate={todayDate}
                onUpdateAssessment={onUpdateAssessment}
                onOpenDetail={onOpenDetail}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
