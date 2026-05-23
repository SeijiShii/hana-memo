import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  parseISO,
  daysBetween,
  addDays,
  startOfMonth,
  endOfMonth,
} from "./date";

describe("parseISO", () => {
  it("parses valid ISO 8601", () => {
    const d = parseISO("2026-05-23T10:00:00+09:00");
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2026);
  });

  it("throws on invalid string", () => {
    expect(() => parseISO("not-a-date")).toThrow(TypeError);
  });
});

describe("formatDate", () => {
  it("formats yyyy-MM-dd", () => {
    expect(formatDate(new Date(2026, 4, 23), "yyyy-MM-dd")).toBe("2026-05-23");
  });

  it("formats M月d日", () => {
    expect(formatDate(new Date(2026, 4, 23), "M月d日")).toBe("5月23日");
  });

  it("throws on invalid Date", () => {
    expect(() => formatDate(new Date("invalid"), "yyyy-MM-dd")).toThrow(
      TypeError,
    );
  });

  describe("relative format", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it("today", () => {
      expect(formatDate(new Date(2026, 4, 23, 8, 0, 0), "relative")).toBe(
        "今日",
      );
    });
    it("yesterday", () => {
      expect(formatDate(new Date(2026, 4, 22, 8, 0, 0), "relative")).toBe(
        "昨日",
      );
    });
    it("days ago", () => {
      expect(formatDate(new Date(2026, 4, 20, 8, 0, 0), "relative")).toBe(
        "3日前",
      );
    });
    it("weeks ago", () => {
      expect(formatDate(new Date(2026, 4, 10, 8, 0, 0), "relative")).toBe(
        "1週間前",
      );
    });
    it("months ago", () => {
      expect(formatDate(new Date(2026, 1, 23, 8, 0, 0), "relative")).toBe(
        "2か月前",
      );
    });
    it("1 year ago", () => {
      expect(formatDate(new Date(2025, 4, 22, 8, 0, 0), "relative")).toBe(
        "1年前",
      );
    });
    it("2 years ago", () => {
      expect(formatDate(new Date(2024, 4, 23, 8, 0, 0), "relative")).toBe(
        "2年前",
      );
    });
  });
});

describe("daysBetween", () => {
  it("returns absolute days", () => {
    const a = new Date(2026, 4, 23);
    const b = new Date(2026, 4, 25);
    expect(daysBetween(a, b)).toBe(2);
    expect(daysBetween(b, a)).toBe(2);
  });

  it("returns 0 for same day", () => {
    const a = new Date(2026, 4, 23, 0, 0, 0);
    const b = new Date(2026, 4, 23, 23, 59, 59);
    expect(daysBetween(a, b)).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const r = addDays(new Date(2026, 4, 23), 5);
    expect(r.getDate()).toBe(28);
  });

  it("adds negative days", () => {
    const r = addDays(new Date(2026, 4, 23), -3);
    expect(r.getDate()).toBe(20);
  });

  it("crosses month boundary", () => {
    const r = addDays(new Date(2026, 4, 30), 5);
    expect(r.getMonth()).toBe(5); // June (0-indexed)
    expect(r.getDate()).toBe(4);
  });
});

describe("startOfMonth / endOfMonth", () => {
  it("startOfMonth returns 1st day", () => {
    const r = startOfMonth(new Date(2026, 4, 23));
    expect(r.getDate()).toBe(1);
    expect(r.getMonth()).toBe(4);
  });

  it("endOfMonth returns last day with 23:59:59.999", () => {
    const r = endOfMonth(new Date(2026, 4, 15));
    expect(r.getDate()).toBe(31); // May 31
    expect(r.getHours()).toBe(23);
  });

  it("endOfMonth handles February (28 days)", () => {
    const r = endOfMonth(new Date(2026, 1, 10));
    expect(r.getDate()).toBe(28);
  });

  it("endOfMonth handles leap year February (29 days)", () => {
    const r = endOfMonth(new Date(2024, 1, 10)); // 2024 is leap
    expect(r.getDate()).toBe(29);
  });
});
