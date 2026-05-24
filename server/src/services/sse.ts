import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("data: {\"type\":\"connected\"}\n\n");
  clients.add(res);

  res.on("close", () => {
    clients.delete(res);
  });
}

export function broadcast(event: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}

export function getClientCount() {
  return clients.size;
}
