import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VALID_TRANSITIONS, DbOrderStatus } from "../src/lib/order-status";

describe("State Machine Drift Prevention", () => {
  it("TypeScript VALID_TRANSITIONS matches SQL migration logic", () => {
    // 1. Load migrations to find the latest definition of process_order_status_update
    const migrationDir = path.join(process.cwd(), "supabase/migrations");
    const files = fs.readdirSync(migrationDir).sort();

    let sqlContent = "";
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationDir, file), "utf8");
      if (content.includes("FUNCTION public.process_order_status_update")) {
        sqlContent = content;
      }
    }

    expect(sqlContent).toBeTruthy();

    // 2. Extract allowed transitions from SQL definition
    const sqlTransitions: Record<string, string[]> = {};

    // Pattern 1: v_allowed_transitions := CASE v_order_current.status ... END;
    const caseBlock = sqlContent.match(
      /v_allowed_transitions\s*:=\s*CASE\s+v_order_current\.status([\s\S]*?)END;/
    );

    if (caseBlock) {
      const caseRegex = /WHEN\s+'([^']+)'\s+THEN\s+ARRAY\[([^\]]+)\]/g;
      let match;
      while ((match = caseRegex.exec(caseBlock[1])) !== null) {
        const fromStatus = match[1];
        const targets = match[2]
          .split(",")
          .map((s) => s.trim().replace(/'/g, ""));
        sqlTransitions[fromStatus] = targets;
      }
    } else {
      // Pattern 2: IF p_old_status = '...' THEN IF p_new_status NOT IN (...)
      const lines = sqlContent.split("\n");
      let currentStatus = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const oldMatch = line.match(/(?:IF|ELSIF)\s+p_old_status\s*=\s*'([^']+)'\s*THEN/);
        if (oldMatch) {
          currentStatus = oldMatch[1];
          if (!sqlTransitions[currentStatus]) sqlTransitions[currentStatus] = [];
        } else if (currentStatus) {
          const newMatch = line.match(/IF\s+p_new_status\s+NOT\s+IN\s*\(([^)]+)\)/);
          if (newMatch) {
            const targets = newMatch[1]
              .split(",")
              .map((s) => s.trim().replace(/'/g, ""));
            sqlTransitions[currentStatus] = targets;
            currentStatus = "";
          }
        }
      }
    }

    // Must find at least 5 transition rules (fail loudly if parser found fewer)
    const parsedRuleCount = Object.keys(sqlTransitions).length;
    expect(parsedRuleCount).toBeGreaterThanOrEqual(5);

    // 3. Assert EVERY non-terminal TS status is compared without silent skips
    const activeTsStatuses = (Object.keys(VALID_TRANSITIONS) as DbOrderStatus[]).filter(
      (status) => VALID_TRANSITIONS[status].length > 0
    );

    expect(activeTsStatuses.length).toBeGreaterThanOrEqual(5);

    for (const status of activeTsStatuses) {
      // Fail test if SQL parser did not find this status
      expect(sqlTransitions).toHaveProperty(status);

      const sqlTargets = [...sqlTransitions[status]].sort();
      const tsTargets = [...VALID_TRANSITIONS[status]].sort();
      expect(sqlTargets).toEqual(tsTargets);
    }

    // Terminal statuses (DELIVERED, CANCELLED) must have 0 transitions
    const terminalStatuses = (Object.keys(VALID_TRANSITIONS) as DbOrderStatus[]).filter(
      (status) => VALID_TRANSITIONS[status].length === 0
    );
    for (const status of terminalStatuses) {
      const sqlTargets = sqlTransitions[status] || [];
      expect(sqlTargets).toEqual([]);
    }
  });
});
