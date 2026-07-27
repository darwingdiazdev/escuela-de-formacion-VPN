import { CHURCH_LOCATIONS, type ChurchLocation } from "@gestion-notas/domain";

export const PENSUM_OPTIONS = ["Pensum 2", "Pensum 3"] as const;

export type PensumOption = (typeof PENSUM_OPTIONS)[number];

export const CHURCH_OPTIONS = CHURCH_LOCATIONS;

export const DEFAULT_SUBJECT_PRICE_USD = 1;

export interface SubjectOfferingFormState {
  church: ChurchLocation;
  teacherId: string;
}

export interface SubjectTopicFormState {
  content: string;
}

export const emptySubjectForm = {
  code: "",
  name: "",
  pensum: "Pensum 2" as PensumOption,
  priceUsd: String(DEFAULT_SUBJECT_PRICE_USD),
  offerings: [] as SubjectOfferingFormState[],
  topics: [] as SubjectTopicFormState[],
  isActive: true,
};

export function isChurchSelected(
  offerings: SubjectOfferingFormState[],
  church: ChurchLocation,
): boolean {
  return offerings.some((offering) => offering.church === church);
}

export type TeacherAssignmentCache = Partial<Record<ChurchLocation, string>>;

export function normalizeTeacherId(teacherId: string | null | undefined): string {
  if (teacherId == null || teacherId === "") return "";
  return String(teacherId);
}

export function buildTeacherAssignmentCache(
  offerings: SubjectOfferingFormState[],
): TeacherAssignmentCache {
  return Object.fromEntries(
    offerings
      .filter((offering) => offering.teacherId)
      .map((offering) => [offering.church, offering.teacherId]),
  ) as TeacherAssignmentCache;
}

export function toggleChurchOffering(
  offerings: SubjectOfferingFormState[],
  church: ChurchLocation,
  teacherCache: TeacherAssignmentCache = {},
): SubjectOfferingFormState[] {
  if (isChurchSelected(offerings, church)) {
    return offerings.filter((offering) => offering.church !== church);
  }

  return [...offerings, { church, teacherId: teacherCache[church] ?? "" }];
}

export function setOfferingTeacher(
  offerings: SubjectOfferingFormState[],
  church: ChurchLocation,
  teacherId: string,
): SubjectOfferingFormState[] {
  return offerings.map((offering) =>
    offering.church === church ? { ...offering, teacherId } : offering,
  );
}

export function offeringsToPayload(offerings: SubjectOfferingFormState[]) {
  return offerings.map((offering) => ({
    church: offering.church,
    teacherId: normalizeTeacherId(offering.teacherId) || undefined,
  }));
}

export function topicsToPayload(topics: SubjectTopicFormState[]) {
  return topics
    .map((topic) => topic.content.trim())
    .filter((content) => content.length > 0)
    .map((content, index) => ({
      order: index + 1,
      content,
    }));
}

export function addSubjectTopic(topics: SubjectTopicFormState[]): SubjectTopicFormState[] {
  return [...topics, { content: "" }];
}

export function updateSubjectTopicContent(
  topics: SubjectTopicFormState[],
  index: number,
  content: string,
): SubjectTopicFormState[] {
  return topics.map((topic, topicIndex) =>
    topicIndex === index ? { ...topic, content } : topic,
  );
}

export function removeSubjectTopic(
  topics: SubjectTopicFormState[],
  index: number,
): SubjectTopicFormState[] {
  return topics.filter((_, topicIndex) => topicIndex !== index);
}

export function nextTopicLabel(topicsLength: number): string {
  return `Agregar TEMA ${topicsLength + 1}`;
}
