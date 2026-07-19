/**
 * Materias del plan de estudios — Escuela de Formación Bíblica.
 * Pensum 2: Nivel Medio "Instrumentos Escogidos" (12 materias activas)
 * Pensum 3: Nivel Superior "Mentor" (2 materias inactivas)
 */

export const PENSUM_SUBJECTS = [
  // --- Pensum 2 ---
  { code: "HD001", name: "HACEDORES DE DISCIPULOS", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "E002", name: "EVANGELISMO", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "F003", name: "LA FAMILIA", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "ESP004", name: "ESTUDIO SISTEMÁTICO DE LA PALABRA", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "P005", name: "PLANIFICACIÓN", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "I006", name: "INTERCESIÓN", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "CM007", name: "CINCO MINISTERIOS", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "D008", name: "DIACONADO", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "CC009", name: "EL CARÁCTER CRISTIANO", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "AA010", name: "ALABANZA Y ADORACIÓN", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "DD011", name: "LA DIVINIDAD DE DIOS", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  { code: "EB012", name: "ESCATOLOGÍA BÍBLICA", pensum: "Pensum 2", priceUsd: 1, isActive: true },
  // --- Pensum 3 ---
  { code: "HB0013", name: "HERMENÉUTICA BÍBLICA", pensum: "Pensum 3", priceUsd: 1, isActive: false },
  { code: "OHB0014", name: "ORATORIA Y HOMILÉTICA BÍBLICA", pensum: "Pensum 3", priceUsd: 1, isActive: false },
] as const;
