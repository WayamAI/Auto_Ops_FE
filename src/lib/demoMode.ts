/**
 * Demo mode runs the app fully client side for demonstrations: any syntactically
 * valid email + any non empty password signs in, and dashboards are populated
 * from a local demo data provider instead of a live backend.
 *
 * Defaults to ON when VITE_DEMO_MODE is unset, so the app is demoable with zero
 * setup. Set VITE_DEMO_MODE=false to use the real backend and OTP based auth.
 */
export const isDemoMode = (): boolean => {
  const value = import.meta.env.VITE_DEMO_MODE as string | undefined;
  return value === undefined || value === "" || value === "true";
};

export const DEMO_TOKEN_PREFIX = "demo-token-";

export const isDemoToken = (token: string | null | undefined): boolean =>
  !!token && token.startsWith(DEMO_TOKEN_PREFIX);
