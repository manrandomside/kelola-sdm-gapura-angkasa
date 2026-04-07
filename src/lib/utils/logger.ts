// Lightweight logger yang hanya aktif di development. Di production,
// seluruh method menjadi no-op agar tidak mencemari console browser/server.

const isDev = process.env.NODE_ENV !== "production";

type LogArgs = readonly unknown[];

export const logger = {
  log(...args: LogArgs): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  info(...args: LogArgs): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  warn(...args: LogArgs): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error(...args: LogArgs): void {
    // Error selalu dicetak — baik di dev maupun production —
    // karena informasinya kritis untuk debugging insiden.
    // eslint-disable-next-line no-console
    console.error(...args);
  },
  debug(...args: LogArgs): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};
