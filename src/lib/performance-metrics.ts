"use client";

export type ClientActionTimer = {
  finish: (status?: "success" | "error") => void;
};

export function startClientActionTimer(name: string): ClientActionTimer {
  if (typeof window === "undefined" || typeof window.performance === "undefined") {
    return { finish: () => undefined };
  }

  const token = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startMark = `${token}-start`;
  const endMark = `${token}-end`;
  window.performance.mark(startMark);

  return {
    finish(status = "success") {
      try {
        window.performance.mark(endMark);
        const measure = window.performance.measure(`morais:${name}:${status}`, startMark, endMark);
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[performance] ${name} ${status}: ${Math.round(measure.duration)}ms`);
        }
        window.performance.clearMarks(startMark);
        window.performance.clearMarks(endMark);
        window.performance.clearMeasures(measure.name);
      } catch {
        // Performance measurement must never interfere with a financial action.
      }
    },
  };
}
