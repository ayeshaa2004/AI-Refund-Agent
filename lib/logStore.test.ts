describe("logStore", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("starts empty", async () => {
    const { getLogs } = await import("./logStore");

    expect(getLogs()).toEqual([]);
  });

  it("adds an entry with an auto-generated id and timestamp", async () => {
    const { addLog } = await import("./logStore");

    const entry = addLog({
      customerId: "CUST-01",
      userMessage: "hi",
      reply: "hello, how can I help?",
      trace: [],
    });

    expect(entry.id).toBe(1);
    expect(typeof entry.timestamp).toBe("string");
    expect(new Date(entry.timestamp).toString()).not.toBe("Invalid Date");
    expect(entry.userMessage).toBe("hi");
  });

  it("increments the id on each subsequent entry", async () => {
    const { addLog } = await import("./logStore");

    const first = addLog({
      customerId: "CUST-01",
      userMessage: "a",
      reply: "b",
      trace: [],
    });

    const second = addLog({
      customerId: "CUST-01",
      userMessage: "c",
      reply: "d",
      trace: [],
    });

    expect(second.id).toBe(first.id + 1);
  });

  it("getLogs returns entries in insertion order", async () => {
    const { addLog, getLogs } = await import("./logStore");

    addLog({
      customerId: "CUST-01",
      userMessage: "first",
      reply: "",
      trace: [],
    });

    addLog({
      customerId: "CUST-01",
      userMessage: "second",
      reply: "",
      trace: [],
    });

    const logs = getLogs();

    expect(logs.map((l: { userMessage: string }) => l.userMessage)).toEqual([
      "first",
      "second",
    ]);
  });
});
