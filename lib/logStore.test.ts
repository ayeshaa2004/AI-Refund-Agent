let mockLogs: unknown = null;

jest.mock("./redis", () => ({
  redis: {
    get: jest.fn(async () => mockLogs),
    set: jest.fn(async (_key: string, value: unknown) => {
      mockLogs = value;
    }),
  },
}));

describe("logStore", () => {
  beforeEach(() => {
    jest.resetModules();
    mockLogs = null;
  });

  it("starts empty", async () => {
    const { getLogs } = await import("./logStore");

    expect(await getLogs()).toEqual([]);
  });

  it("adds an entry with an auto-generated id and timestamp", async () => {
    const { addLog } = await import("./logStore");

    const entry = await addLog({
      customerId: "CUST-01",
      userMessage: "hi",
      reply: "hello, how can I help?",
      trace: [],
    });

    expect(typeof entry.id).toBe("string");
    expect(entry.id).toBeTruthy();
    expect(typeof entry.timestamp).toBe("string");
    expect(new Date(entry.timestamp).toString()).not.toBe("Invalid Date");
    expect(entry.userMessage).toBe("hi");
  });

  it("generates a unique id for each entry", async () => {
    const { addLog } = await import("./logStore");

    const first = await addLog({
      customerId: "CUST-01",
      userMessage: "a",
      reply: "b",
      trace: [],
    });

    const second = await addLog({
      customerId: "CUST-01",
      userMessage: "c",
      reply: "d",
      trace: [],
    });

    expect(second.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
  });

  it("getLogs returns entries in insertion order", async () => {
    const { addLog, getLogs } = await import("./logStore");

    await addLog({
      customerId: "CUST-01",
      userMessage: "first",
      reply: "",
      trace: [],
    });

    await addLog({
      customerId: "CUST-01",
      userMessage: "second",
      reply: "",
      trace: [],
    });

    const logs = await getLogs();

    expect(logs.map((l) => l.userMessage)).toEqual(["first", "second"]);
  });
});
