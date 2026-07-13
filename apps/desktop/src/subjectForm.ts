import { CHURCH_LOCATIONS, type ChurchLocation } from "@gestion-notas/domain";

export const PENSUM_OPTIONS = ["Pensum 2", "Pensum 3"] as const;

export type PensumOption = (typeof PENSUM_OPTIONS)[number];

export const CHURCH_OPTIONS = CHURCH_LOCATIONS;

export const DEFAULT_SUBJECT_PRICE_USD = 1;

export interface SubjectOfferingFormState {
  church: ChurchLocation;
  teacherId: string;
}

export const emptySubjectForm = {
  code: "",
  name: "",
  pensum: "Pensum 2" as PensumOption,
  offerings: [] as SubjectOfferingFormState[],
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
