/**
 * Profesores del plan de estudios con materias aptas (por código).
 * Datos de contacto simulados; aptitudes según la ficha institucional.
 */

export interface SeedTeacher {
  ci: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  educationLevel: string;
  subjectCodes: string[];
}

export const PENSUM_TEACHERS: SeedTeacher[] = [
  {
    ci: "V-12.345.001",
    firstName: "Virginia",
    lastName: "de Castillo",
    phone: "0424-5510101",
    email: "virginia.castillo@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["HD001", "ESP004", "CC009"],
  },
  {
    ci: "V-12.345.002",
    firstName: "Lilia",
    lastName: "de Dugarte",
    phone: "0424-5510102",
    email: "lilia.dugarte@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["HD001", "ESP004", "DD0011"],
  },
  {
    ci: "V-12.345.003",
    firstName: "Eugenia",
    lastName: "de Rangel",
    phone: "0424-5510103",
    email: "eugenia.rangel@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["E002", "CM007"],
  },
  {
    ci: "V-12.345.004",
    firstName: "Luis",
    lastName: "Martínez",
    phone: "0424-5510104",
    email: "luis.martinez@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["E002"],
  },
  {
    ci: "V-12.345.005",
    firstName: "Manuel",
    lastName: "Yepez",
    phone: "0424-5510105",
    email: "manuel.yepez@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["E002", "CC009"],
  },
  {
    ci: "V-12.345.006",
    firstName: "Isaías",
    lastName: "Correa",
    phone: "0424-5510106",
    email: "isaias.correa@efbv.edu",
    educationLevel: "Pastor / Teología",
    subjectCodes: ["E002", "ESP004", "EB0012"],
  },
  {
    ci: "V-12.345.007",
    firstName: "Jesús",
    lastName: "Castillo",
    phone: "0424-5510107",
    email: "jesus.castillo@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["F003", "DD0011"],
  },
  {
    ci: "V-12.345.008",
    firstName: "Luis",
    lastName: "Rivero",
    phone: "0424-5510108",
    email: "luis.rivero@efbv.edu",
    educationLevel: "Pastor / Teología",
    subjectCodes: ["F003", "CC009", "DD0011", "EB0012"],
  },
  {
    ci: "V-12.345.009",
    firstName: "Mariano",
    lastName: "Rangel",
    phone: "0424-5510109",
    email: "mariano.rangel@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["F003", "I006", "D008", "EB0012"],
  },
  {
    ci: "V-12.345.010",
    firstName: "Andrea",
    lastName: "de Mora",
    phone: "0424-5510110",
    email: "andrea.mora@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["F003", "ESP004", "P005", "D008", "CC009"],
  },
  {
    ci: "V-12.345.011",
    firstName: "Miriam",
    lastName: "de Davoin",
    phone: "0424-5510111",
    email: "miriam.davoin@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["P005", "CM007"],
  },
  {
    ci: "V-12.345.012",
    firstName: "Judith",
    lastName: "de Rivero",
    phone: "0424-5510112",
    email: "judith.rivero@efbv.edu",
    educationLevel: "Pastor / Teología",
    subjectCodes: ["I006", "DD0011"],
  },
  {
    ci: "V-12.345.013",
    firstName: "Luis Angel",
    lastName: "Rivero",
    phone: "0424-5510113",
    email: "luisangel.rivero@efbv.edu",
    educationLevel: "Pastor / Teología",
    subjectCodes: ["CM007", "CC009", "AA0010"],
  },
  {
    ci: "V-12.345.014",
    firstName: "Luis F.",
    lastName: "Junior",
    phone: "0424-5510114",
    email: "luis.junior@efbv.edu",
    educationLevel: "Pastor / Teología",
    subjectCodes: ["AA0010"],
  },
  {
    ci: "V-12.345.015",
    firstName: "Angie",
    lastName: "Correa",
    phone: "0424-5510115",
    email: "angie.correa@efbv.edu",
    educationLevel: "Universitario",
    subjectCodes: ["AA0010"],
  },
];
