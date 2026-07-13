import type { DomainEvent } from "@gestion-notas/domain";
import { getDatabase } from "./connection.js";

export async function saveEvent(event: DomainEvent): Promise<void> {
  const database = getDatabase();
  await database.collection("events").insertOne({
    eventId: event.id,
    type: event.type,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    payload: event.payload,
    occurredAt: event.occurredAt,
    version: event.version,
  });
}

export async function getEventsByAggregate(aggregateId: string): Promise<DomainEvent[]> {
  const database = getDatabase();
  const docs = await database
    .collection("events")
    .find({ aggregateId })
    .sort({ occurredAt: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: String(doc.eventId ?? doc._id),
    type: doc.type as string,
    aggregateId: doc.aggregateId as string,
    aggregateType: doc.aggregateType as string,
    payload: doc.payload,
    occurredAt: doc.occurredAt as Date,
    version: doc.version as number,
  }));
}
