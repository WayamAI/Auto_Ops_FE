import type { AccessModuleData, UserDetails } from "./types";
import { DEMO_TOKEN_PREFIX } from "@/lib/demoMode";

// Every module the sidebar can render, granted unconditionally in demo mode
// so no page is locked behind a role the demo user was never assigned.
export const DEMO_MODULE_CODES = [
  "CONTROL_TOWER",
  "AGENTS",
  "ACTIONS",
  "HEALTH_MONITOR",
  "APPROVAL_QUEUE",
  "TOOL_REGISTRY",
  "KNOWLEDGE_ENGINE",
  "ANALYTICS",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

function titleCase(value: string): string {
  return value
    .split(/[.\-_ ]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export interface DemoUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  role: string;
}

/**
 * Derives a believable demo identity from whatever email the user typed, so the
 * same "any valid email" input feels personalized rather than a hardcoded stub.
 */
export function buildDemoUser(email: string): DemoUser {
  const trimmed = email.trim();
  const [localPart, domainPart = ""] = trimmed.split("@");
  const nameGuess = titleCase(localPart) || "Demo User";
  const [firstName, ...rest] = nameGuess.split(" ");
  const domainLabel = domainPart.split(".")[0];
  const company = domainLabel ? titleCase(domainLabel) : "Wayam AI";

  return {
    id: `demo-${trimmed.toLowerCase()}`,
    email: trimmed,
    first_name: firstName || "Demo",
    last_name: rest.join(" ") || "User",
    company_name: company,
    role: "Administrator",
  };
}

export function issueDemoToken(): string {
  return `${DEMO_TOKEN_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Client side stand in for POST /login + /verify_otp: validates the same shape
 * the master demo brief requires (any syntactically valid email, any non empty
 * password) and returns a session immediately, no backend round trip.
 */
export function demoLogin(email: string, password: string): { token: string; user: DemoUser } {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    throw new Error("Enter a valid email address");
  }
  if (!password) {
    throw new Error("Password is required");
  }
  return { token: issueDemoToken(), user: buildDemoUser(trimmed) };
}

export function demoAccessModuleResponse(user: DemoUser): AccessModuleData {
  return {
    user_id: user.id,
    email: user.email,
    role: {
      _id: "demo-role",
      name: user.role,
      code: "ADMIN",
      is_active: true,
      created_at: new Date().toISOString(),
      module_master: DEMO_MODULE_CODES.map((code) => ({
        name: titleCase(code.replace(/_/g, " ")),
        code,
        is_active: true,
        created_at: new Date().toISOString(),
      })),
    },
  };
}

export function demoUserDetails(user: DemoUser): UserDetails {
  const now = new Date().toISOString();
  return {
    user_id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    company_name: user.company_name,
    phone_number: "",
    email: user.email,
    company_size: "",
    role_code: "ADMIN",
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}
