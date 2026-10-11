import { assessmentLevels } from "./assessment-catalog";
export interface SubTopic {
  id: string;
  title: string;
  duration: string;
}
export interface CourseModuleItem {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  level: keyof typeof assessmentLevels;
  levelName: string;
  subTopics: SubTopic[];
}
export interface LearningTrack {
  id: string;
  owner_id: string;
  publisher_name: string;
  title: string;
  category: string;
  description: string;
  status: string;
  totalModules: number;
  modules: CourseModuleItem[];
  resources: { name: string; description: string; url: string }[];
}
export function normalizeTrack(row: any): LearningTrack {
  return {
    ...row,
    totalModules: row.modules.length,
    modules: row.modules.map((m: CourseModuleItem, i: number) => ({
      ...m,
      moduleNumber: i + 1,
      levelName: assessmentLevels[m.level],
    })),
  };
}
