import { createAppContext, type ApplicationService } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import { app, BrowserWindow, dialog, ipcMain, nativeImage } from "electron";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, "../public/logos/logo-2.png"),
    path.join(__dirname, "../dist/logos/logo-2.png"),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

let service: ApplicationService;

async function initBackend() {
  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  const ctx = await createAppContext({ mongoUri, dbName });
  service = ctx.service;
  await seedDemoAdmin();
}

async function seedDemoAdmin() {
  try {
    await service.createUser({
      email: "admin@VPN",
      password: "admin123",
      firstName: "Admin",
      lastName: "Sistema",
      role: "admin",
    });
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("correo"))) throw err;
  }
}

function registerIpcHandlers() {
  ipcMain.handle("auth:login", (_e, email: string, password: string) =>
    service.authenticateUser(email, password),
  );

  ipcMain.handle("users:list", () => service.listUsers());
  ipcMain.handle("users:create", (_e, input) => service.createUser(input));
  ipcMain.handle("users:update", (_e, id, input) => service.updateUser(id, input));

  ipcMain.handle("students:list", () => service.listStudents());
  ipcMain.handle("students:create", (_e, input) => service.createStudent(input));
  ipcMain.handle("students:update", (_e, id, input) => service.updateStudent(id, input));
  ipcMain.handle("students:delete", (_e, id) => service.deleteStudent(id));
  ipcMain.handle("students:setEnrollmentPayment", (_e, studentId, subjectId, church, paymentStatus) =>
    service.setEnrollmentPayment(studentId, subjectId, church, paymentStatus),
  );
  ipcMain.handle("students:retakeEnrollment", (_e, studentId, subjectId, church) =>
    service.retakeEnrollment(studentId, subjectId, church),
  );

  ipcMain.handle("teachers:list", () => service.listTeachers());
  ipcMain.handle("teachers:create", (_e, input) => service.createTeacher(input));
  ipcMain.handle("teachers:update", (_e, id, input) => service.updateTeacher(id, input));
  ipcMain.handle("teachers:delete", (_e, id) => service.deleteTeacher(id));

  ipcMain.handle("subjects:list", () => service.listSubjects());
  ipcMain.handle("subjects:create", (_e, input) => service.createSubject(input));
  ipcMain.handle("subjects:update", (_e, id, input) => service.updateSubject(id, input));
  ipcMain.handle("subjects:delete", (_e, id) => service.deleteSubject(id));

  ipcMain.handle("grades:list", () => service.listGrades());
  ipcMain.handle("grades:listAll", () => service.listAllGrades());
  ipcMain.handle("grades:create", (_e, input) => service.createGrade(input));
  ipcMain.handle("grades:update", (_e, id, input) => service.updateGrade(id, input));

  ipcMain.handle(
    "export:saveExcel",
    async (_e, data: Uint8Array, defaultFileName: string) => {
      const win = BrowserWindow.getFocusedWindow();
      const dialogOptions = {
        title: "Guardar Excel",
        defaultPath: defaultFileName,
        filters: [{ name: "Excel", extensions: ["xlsx"] as string[] }],
      };
      const { canceled, filePath } = win
        ? await dialog.showSaveDialog(win, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions);

      if (canceled || !filePath) {
        return { saved: false as const };
      }

      await writeFile(filePath, Buffer.from(data));
      return { saved: true as const, filePath };
    },
  );
}

function createWindow() {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Gestión de Notas",
    ...(iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    await initBackend();
    registerIpcHandlers();
    createWindow();
  } catch (error) {
    console.error("Error al iniciar la aplicación:", error);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await disconnectDatabase();
  if (process.platform !== "darwin") app.quit();
});
