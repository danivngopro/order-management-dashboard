import { Response } from 'express';

interface Subscriber {
  res: Response;
  supplier_id?: string;
}

class SSEManager {
  private subscribers: Set<Subscriber> = new Set();

  subscribe(res: Response, supplier_id?: string) {
    const subscriber: Subscriber = { res, supplier_id };
    this.subscribers.add(subscriber);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(':\n\n');

    res.on('close', () => {
      this.subscribers.delete(subscriber);
    });

    return subscriber;
  }

  broadcast(event: any) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    for (const sub of this.subscribers) {
      if (!sub.res.destroyed) {
        sub.res.write(message);
      }
    }
  }

  broadcastToSupplier(supplier_id: string, event: any) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    for (const sub of this.subscribers) {
      if (!sub.res.destroyed && (!sub.supplier_id || sub.supplier_id === supplier_id)) {
        sub.res.write(message);
      }
    }
  }
}

export const sseManager = new SSEManager();
