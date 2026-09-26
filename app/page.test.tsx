import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "./page";
import "@testing-library/jest-dom";
const customers = [
  {
    customerId: "CUST-02",
    customerName: "Rohan Verma",
    orderId: "ORD-1002",
    item: "Running Shoes - Size 9",
  },
];

function mockFetchSequence(responses: Record<string, unknown>) {
  global.fetch = jest.fn((url: string) => {
    const key = Object.keys(responses).find((k) => url.toString().includes(k));
    return Promise.resolve({
      json: async () => (key ? responses[key] : {}),
    }) as unknown as ReturnType<typeof fetch>;
  }) as unknown as typeof fetch;
}

describe("ChatPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the customer list on mount and disables input until one is selected", async () => {
    mockFetchSequence({ "/api/customers": { customers } });

    render(<ChatPage />);

    expect(
      await screen.findByText(
        "Rohan Verma — Running Shoes - Size 9 (ORD-1002)",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Select a customer first"),
    ).toBeDisabled();
  });

  it("sends a message once a customer is selected and renders the agent's reply", async () => {
    const user = userEvent.setup();
    mockFetchSequence({
      "/api/customers": { customers },
      "/api/chat": { reply: "Sure, let me look into that for you." },
    });

    render(<ChatPage />);

    const select = await screen.findByRole("combobox");

    await screen.findByRole("option", {
      name: /Rohan Verma/i,
    });

    await user.selectOptions(select, "CUST-02");

    const input = screen.getByPlaceholderText("Type your message...");
    await user.type(input, "I want a refund");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("I want a refund")).toBeInTheDocument();
    expect(
      await screen.findByText("Sure, let me look into that for you."),
    ).toBeInTheDocument();

    const chatCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
      c[0].toString().includes("/api/chat"),
    );
    const body = JSON.parse(chatCall[1].body);
    expect(body.customerId).toBe("CUST-02");
    expect(body.message).toBe("I want a refund");
  });

  it("shows a fallback message if the chat request fails outright", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn((url: string) => {
      if (url.toString().includes("/api/customers")) {
        return Promise.resolve({
          json: async () => ({ customers }),
        }) as unknown as ReturnType<typeof fetch>;
      }

      return Promise.reject(new Error("network down"));
    }) as unknown as typeof fetch;

    render(<ChatPage />);

    const select = await screen.findByRole("combobox");

    await screen.findByRole("option", {
      name: /Rohan Verma/i,
    });

    await user.selectOptions(select, "CUST-02");

    const input = screen.getByPlaceholderText("Type your message...");
    await user.type(input, "hello");

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Something went wrong reaching the server."),
    ).toBeInTheDocument();
  });
});
