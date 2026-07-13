import type { DomainEvent } from "@gestion-notas/domain";
import type { EventHandler } from "./event-bus.js";

type Logger = {
  info: (message: string, meta?: Record<string, string>) => void;
};

const defaultLogger: Logger = {
  info: () => undefined,
};

export function createAuditLogHandler(logger: Logger = defaultLogger): EventHandler {
  return (event: DomainEvent) => {
    logger.info(`[AUDIT] ${event.type}`, {
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt.toISOString(),
    });
  };
}

export function registerDefaultHandlers(
  subscribe: <TPayload>(eventType: string, handler: EventHandler<TPayload>) => () => void,
): void {
  const auditHandler = createAuditLogHandler();

  const allEventTypes = [
    "user.created",
    "user.updated",
    "student.created",
    "student.updated",
    "teacher.created",
    "teacher.updated",
    "subject.created",
    "subject.updated",
  ];

  for (const eventType of allEventTypes) {
    subscribe(eventType, auditHandler);
  }
}
