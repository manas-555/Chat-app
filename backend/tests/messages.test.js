// tests/messages.plain.test.js
import express from "express";
import request from "supertest";

/*
  Plain API test that bypasses DB + auth.
  Implements minimal in-memory storage for messages so we can:
    - POST /api/messages/:id  -> create a message for receiver id
    - GET  /api/messages/:id  -> get messages for receiver id
*/

function createApp() {
  const app = express();
  app.use(express.json());

  // In-memory store: { receiverId: [ { _id, text, sender, receiver, createdAt } ] }
  const store = {};

  // POST -> send message to receiver
  app.post("/api/messages/:id", (req, res) => {
    const receiver = req.params.id;
    const { text, sender = "testSender" } = req.body || {};

    if (!text) return res.status(400).json({ error: "text required" });

    const message = {
      _id: Math.random().toString(36).slice(2, 10),
      text,
      sender,
      receiver,
      createdAt: new Date().toISOString(),
    };

    if (!store[receiver]) store[receiver] = [];
    store[receiver].push(message);

    return res.status(201).json(message);
  });

  // GET -> fetch messages for receiver
  app.get("/api/messages/:id", (req, res) => {
    const receiver = req.params.id;
    const messages = store[receiver] || [];
    return res.status(200).json(messages);
  });

  return app;
}

describe("Plain message API (no DB, no auth)", () => {
  const app = createApp();
  const receiverId = "receiver-abc-123";
  let createdMessageId;

  it("POST /api/messages/:id should create and return a message", async () => {
    const payload = { text: "Hello from plain test!", sender: "unit-test-sender" };

    const res = await request(app)
      .post(`/api/messages/${receiverId}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.text).toBe(payload.text);
    expect(res.body.sender).toBe(payload.sender);

    createdMessageId = res.body._id;
  });

  it("GET /api/messages/:id should return created message", async () => {
    const res = await request(app).get(`/api/messages/${receiverId}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const found = res.body.find((m) => m._id === createdMessageId);
    expect(found).toBeDefined();
    expect(found.text).toBe("Hello from plain test!");
  });
});


