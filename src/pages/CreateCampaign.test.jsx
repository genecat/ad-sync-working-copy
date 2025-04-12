import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateCampaign from "./CreateCampaign";
import { supabase } from "../lib/supabaseClient";

// Mock Supabase to avoid real API calls
jest.mock("../lib/supabaseClient", () => {
  const fromMock = jest.fn();
  const insertMock = jest.fn().mockReturnThis();
  const selectMock = jest.fn().mockReturnThis();
  const singleMock = jest.fn();
  const eqMock = jest.fn().mockReturnThis();
  const rpcMock = jest.fn().mockImplementation((fnName) => {
    if (fnName === "get_vacant_frames") {
      return Promise.resolve({
        data: [{ listing_id: "1", frame_key: "frame1" }],
        error: null,
      });
    }
    if (fnName === "is_frame_vacant") {
      return Promise.resolve({ data: true, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  fromMock.mockImplementation((table) => {
    if (table === "listings") {
      return {
        select: jest.fn().mockImplementation((fields) => {
          if (fields === "*, publisher_id") {
            return {
              eq: jest.fn().mockImplementation((key, value) => {
                if (key === "category" && value === "Technology") {
                  return Promise.resolve({
                    data: [
                      {
                        id: "1",
                        publisher_id: "pub1",
                        website: "https://example.com",
                        category: "Technology",
                        selected_frames: { frame1: { size: "300x250" } },
                      },
                    ],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              }),
            };
          }
          return {
            eq: eqMock,
            single: singleMock.mockResolvedValue({ data: { publisher_id: "pub1" }, error: null }),
          };
        }),
      };
    }
    if (table === "frames") {
      return {
        select: selectMock,
        insert: insertMock,
        eq: eqMock,
        single: singleMock.mockResolvedValue({
          data: { id: "frame123" },
          error: null,
        }),
      };
    }
    if (table === "campaigns") {
      return {
        insert: insertMock,
        select: selectMock,
        single: singleMock.mockResolvedValue({
          data: { id: "123" },
          error: null,
        }),
      };
    }
    return {
      insert: insertMock,
      select: selectMock,
      single: singleMock,
      eq: eqMock,
    };
  });

  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
  };
});

describe("CreateCampaign Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("selects category and searches publishers", async () => {
    render(<CreateCampaign />);

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Technology" } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /search publishers/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/https:\/\/example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/300x250/i)).toBeInTheDocument();
      expect(screen.queryByText(/No publishers with vacant frames/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("selects publisher and proceeds to campaign details", async () => {
    render(<CreateCampaign />);

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Technology" } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /search publishers/i }));
    });

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: /https:\/\/example.com/i });
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/campaign title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/campaign budget/i)).toBeInTheDocument();
      expect(screen.queryByText(/No publishers with vacant frames/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("fills campaign details and proceeds to publisher details", async () => {
    render(<CreateCampaign />);

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Technology" } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /search publishers/i }));
    });

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: /https:\/\/example.com/i });
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/campaign title/i), { target: { value: "Test Campaign" } });
      fireEvent.change(screen.getByLabelText(/campaign budget/i), { target: { value: "1000" } });
      fireEvent.change(screen.getByLabelText(/daily spend limit/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: "https://test.com" } });
      const endDateContainer = screen.getByText(/end date/i).closest("div");
      const numberInputs = endDateContainer.querySelectorAll('input[type="number"]');
      fireEvent.change(numberInputs[0], { target: { value: "2025" } }); // Year
      fireEvent.change(numberInputs[1], { target: { value: "12" } });   // Month
      fireEvent.change(numberInputs[2], { target: { value: "31" } });   // Day
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Publisher: https:\/\/example.com/i)).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /300x250/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("selects frames and proceeds to review", async () => {
    render(<CreateCampaign />);

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Technology" } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /search publishers/i }));
    });

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: /https:\/\/example.com/i });
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/campaign title/i), { target: { value: "Test Campaign" } });
      fireEvent.change(screen.getByLabelText(/campaign budget/i), { target: { value: "1000" } });
      fireEvent.change(screen.getByLabelText(/daily spend limit/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: "https://test.com" } });
      const endDateContainer = screen.getByText(/end date/i).closest("div");
      const numberInputs = endDateContainer.querySelectorAll('input[type="number"]');
      fireEvent.change(numberInputs[0], { target: { value: "2025" } }); // Year
      fireEvent.change(numberInputs[1], { target: { value: "12" } });   // Month
      fireEvent.change(numberInputs[2], { target: { value: "31" } });   // Day
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      const frameCheckbox = screen.getByRole("checkbox", { name: /300x250/i });
      fireEvent.click(frameCheckbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Campaign Details/i, level: 3 })).toBeInTheDocument();
      expect(screen.getByText(/Test Campaign/i)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Selected Publishers/i, level: 3 })).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/example.com/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("submits campaign successfully", async () => {
    const mockSession = { user: { id: "user1" } };
    render(<CreateCampaign session={mockSession} />);

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Technology" } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /search publishers/i }));
    });

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: /https:\/\/example.com/i });
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/campaign title/i), { target: { value: "Test Campaign" } });
      fireEvent.change(screen.getByLabelText(/campaign budget/i), { target: { value: "1000" } });
      fireEvent.change(screen.getByLabelText(/daily spend limit/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: "https://test.com" } });
      const endDateContainer = screen.getByText(/end date/i).closest("div");
      const numberInputs = endDateContainer.querySelectorAll('input[type="number"]');
      fireEvent.change(numberInputs[0], { target: { value: "2025" } }); // Year
      fireEvent.change(numberInputs[1], { target: { value: "12" } });   // Month
      fireEvent.change(numberInputs[2], { target: { value: "31" } });   // Day
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      const frameCheckbox = screen.getByRole("checkbox", { name: /300x250/i });
      fireEvent.click(frameCheckbox);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /submit campaign/i }));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /confirm submit/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Campaign Submitted Successfully/i)).toBeInTheDocument();

      expect(supabase.from).toHaveBeenCalledWith("campaigns");
      const campaignsCallIndex = supabase.from.mock.calls.findIndex(
        (call) => call[0] === "campaigns"
      );
      if (campaignsCallIndex >= 0) {
        const campaignsReturnObject = supabase.from.mock.results[campaignsCallIndex].value;
        expect(campaignsReturnObject.insert).toHaveBeenCalled();
      }

      expect(supabase.from).toHaveBeenCalledWith("frames");
      const framesCallIndex = supabase.from.mock.calls.findIndex(
        (call) => call[0] === "frames"
      );
      if (framesCallIndex >= 0) {
        const framesReturnObject = supabase.from.mock.results[framesCallIndex].value;
        expect(framesReturnObject.insert).toHaveBeenCalled();
      }
    }, { timeout: 2000 });
  });
});