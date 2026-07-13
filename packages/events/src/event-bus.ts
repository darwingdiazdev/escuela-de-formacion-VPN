import type { DomainEvent } from "@gestion-notas/domain";

export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(eventType: string, handler: EventHandler<TPayload>): () => void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe<TPayload>(eventType: string, handler: EventHandler<TPayload>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers?.size) return;

    await Promise.all([...handlers].map((handler) => handler(event)));
  }
}

export function createEventBus(): EventBus {
  return new InMemoryEventBus();
}
