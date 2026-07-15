import { createAppContext, type ApplicationService, type PublicUser } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import cors from "cors";
import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const jwtSecret = process.env.AUTH_SECRET ?? "gestion-notas-dev-secret";
const corsOrigin = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(",").map((value) => value.trim()) : true,
  }),
);
app.use(express.json({ limit: "2mb" }));

type AuthedRequest = express.Request & { user?: PublicUser };

function toPublicUser<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function signToken(user: PublicUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", jwtSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): PublicUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", jwtSecret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PublicUser & {
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Sesión inválida o expirada." });
    return;
  }

  req.user = user;
  next();
}

async function seedDemoAdmin(service: ApplicationService) {
  try {
    await service.createUser({
      email: "admin@VPN",
      password: "admin123",
      firstName: "Admin",
      lastName: "Sistema",
      role: "admin",
    });
    console.log("Usuario demo creado: admin@VPN / admin123");
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("correo"))) throw err;
  }
}

function asyncHandler(
  handler: (req: AuthedRequest, res: express.Response, next: express.NextFunction) => Promise<void>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function paramId(req: express.Request): string {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new Error("ID inválido.");
  return id;
}

async function start() {
  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  console.log(`Conectando a MongoDB (${dbName})...`);
  const { service } = await createAppContext({ mongoUri, dbName });
  await seedDemoAdmin(service);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", mode: "api", db: dbName });
  });

  app.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const email = String(req.body?.email ?? "");
      const password = String(req.body?.password ?? "");
      const user = await service.authenticateUser(email, password);
      const token = signToken(user);
      res.json({ user, token });
    }),
  );

  app.get(
    "/auth/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ user: req.user });
    }),
  );

  app.get(
    "/users",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const users = await service.listUsers();
      res.json(users.map((user) => toPublicUser(user)));
    }),
  );

  app.post(
    "/users",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await service.createUser(req.body);
      res.status(201).json(toPublicUser(user));
    }),
  );

  app.patch(
    "/users/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await service.updateUser(paramId(req), req.body);
      res.json(toPublicUser(user));
    }),
  );

  app.get(
    "/students",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await service.listStudents());
    }),
  );

  app.post(
    "/students",
    requireAuth,
    asyncHandler(async (req, res) => {
      const student = await service.createStudent(req.body);
      res.status(201).json(student);
    }),
  );

  app.patch(
    "/students/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await service.updateStudent(paramId(req), req.body));
    }),
  );

  app.post(
    "/students/:id/enrollment-payment",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { subjectId, church, paymentStatus } = req.body;
      res.json(
        await service.setEnrollmentPayment(paramId(req), subjectId, church, paymentStatus),
      );
    }),
  );

  app.post(
    "/students/:id/retake-enrollment",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { subjectId, church } = req.body;
      res.json(await service.retakeEnrollment(paramId(req), subjectId, church));
    }),
  );

  app.get(
    "/teachers",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await service.listTeachers());
    }),
  );

  app.post(
    "/teachers",
    requireAuth,
    asyncHandler(async (req, res) => {
      const teacher = await service.createTeacher(req.body);
      res.status(201).json(teacher);
    }),
  );

  app.patch(
    "/teachers/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await service.updateTeacher(paramId(req), req.body));
    }),
  );

  app.get(
    "/subjects",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await service.listSubjects());
    }),
  );

  app.post(
    "/subjects",
    requireAuth,
    asyncHandler(async (req, res) => {
      const subject = await service.createSubject(req.body);
      res.status(201).json(subject);
    }),
  );

  app.patch(
    "/subjects/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await service.updateSubject(paramId(req), req.body));
    }),
  );

  app.get(
    "/grades",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await service.listGrades());
    }),
  );

  app.get(
    "/grades/all",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await service.listAllGrades());
    }),
  );

  app.post(
    "/grades",
    requireAuth,
    asyncHandler(async (req, res) => {
      const grade = await service.createGrade(req.body);
      res.status(201).json(grade);
    }),
  );

  app.patch(
    "/grades/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await service.updateGrade(paramId(req), req.body));
    }),
  );

  const webDistCandidates = [
    path.join(__dirname, "public"),
    path.join(__dirname, "../../web/dist"),
  ];
  const webDist = webDistCandidates.find((candidate) => existsSync(candidate));

  function isApiPath(pathname: string): boolean {
    return [
      "/health",
      "/auth",
      "/users",
      "/students",
      "/teachers",
      "/subjects",
      "/grades",
    ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if (webDist) {
    app.use(express.static(webDist));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (isApiPath(req.path)) {
        next();
        return;
      }
      if (path.extname(req.path)) {
        next();
        return;
      }
      res.sendFile(path.join(webDist, "index.html"));
    });
    console.log(`UI web servida desde ${webDist}`);
  }

  app.use((req, res) => {
    if (isApiPath(req.path)) {
      res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
      return;
    }
    res.status(404).send("Not Found");
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(400).json({ error: err.message });
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`API escuchando en http://0.0.0.0:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Apagando por ${signal}...`);
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
