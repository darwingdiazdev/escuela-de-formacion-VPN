import { connectDatabase, ensureIndexes } from "@gestion-notas/database";
import { createEventBus, registerDefaultHandlers } from "@gestion-notas/events";
import { ApplicationService } from "./service.js";

export interface AppContext {
  service: ApplicationService;
}

export async function createAppContext(config: {
  mongoUri: string;
  dbName: string;
}): Promise<AppContext> {
  const db = await connectDatabase({ uri: config.mongoUri, dbName: config.dbName });
  await ensureIndexes(db);

  const eventBus = createEventBus();
  registerDefaultHandlers((eventType, handler) => eventBus.subscribe(eventType, handler));

  const service = new ApplicationService(eventBus);
  return { service };
}

export * from "./service.js";
