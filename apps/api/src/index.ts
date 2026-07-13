import { createAppContext } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);

app.use(cors());
app.use(express.json());

async function start() {
  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  const { service } = await createAppContext({ mongoUri, dbName });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", mode: "api-stub" });
  });

  app.get("/users", async (_req, res, next) => {
    try {
      res.json(await service.listUsers());
    } catch (err) {
      next(err);
    }
  });

  app.post("/users", async (req, res, next) => {
    try {
      const user = await service.createUser(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/users/:id", async (req, res, next) => {
    try {
      const user = await service.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  app.get("/students", async (_req, res, next) => {
    try {
      res.json(await service.listStudents());
    } catch (err) {
      next(err);
    }
  });

  app.post("/students", async (req, res, next) => {
    try {
      const student = await service.createStudent(req.body);
      res.status(201).json(student);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/students/:id", async (req, res, next) => {
    try {
      const student = await service.updateStudent(req.params.id, req.body);
      res.json(student);
    } catch (err) {
      next(err);
    }
  });

  app.get("/teachers", async (_req, res, next) => {
    try {
      res.json(await service.listTeachers());
    } catch (err) {
      next(err);
    }
  });

  app.post("/teachers", async (req, res, next) => {
    try {
      const teacher = await service.createTeacher(req.body);
      res.status(201).json(teacher);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/teachers/:id", async (req, res, next) => {
    try {
      const teacher = await service.updateTeacher(req.params.id, req.body);
      res.json(teacher);
    } catch (err) {
      next(err);
    }
  });

  app.get("/subjects", async (_req, res, next) => {
    try {
      res.json(await service.listSubjects());
    } catch (err) {
      next(err);
    }
  });

  app.post("/subjects", async (req, res, next) => {
    try {
      const subject = await service.createSubject(req.body);
      res.status(201).json(subject);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/subjects/:id", async (req, res, next) => {
    try {
      const subject = await service.updateSubject(req.params.id, req.body);
      res.json(subject);
    } catch (err) {
      next(err);
    }
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: err.message });
  });

  app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`);
  });

  process.on("SIGINT", async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
