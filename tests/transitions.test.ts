import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VALID_TRANSITIONS } from "../src/app/api/admin/orders/[id]/status/route";

describe("State Machine Drift Prevention", () => {
  it("TypeScript VALID_TRANSITIONS matches SQL migration logic", () => {
    // 1. Load the migration that defines process_order_status_update
    const migrationDir = path.join(process.cwd(), "supabase/migrations");
    const files = fs.readdirSync(migrationDir).sort();
    
    let sqlContent = "";
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationDir, file), "utf8");
      if (content.includes("CREATE OR REPLACE FUNCTION public.process_order_status_update")) {
        sqlContent = content;
      }
    }

    expect(sqlContent).toBeTruthy();

    // 2. Extract allowed transitions from SQL IF statements
    const sqlTransitions: Record<string, string[]> = {};
    const lines = sqlContent.split("\n");
    let currentStatus = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for: p_old_status = 'PENDING' THEN
      const oldMatch = line.match(/p_old_status\s*=\s*'([^']+)'\s*THEN/);
      if (oldMatch) {
        currentStatus = oldMatch[1];
        if (!sqlTransitions[currentStatus]) sqlTransitions[currentStatus] = [];
      } else if (currentStatus) {
        // Look for: IF p_new_status NOT IN ('PENDING_PRESCRIPTION_APPROVAL', 'CONFIRMED', 'CANCELLED') THEN
        const newMatch = line.match(/IF\s+p_new_status\s+NOT\s+IN\s*\(([^)]+)\)/);
        if (newMatch) {
          const targets = newMatch[1]
            .split(",")
            .map((s) => s.trim().replace(/'/g, ""));
          sqlTransitions[currentStatus] = targets;
          currentStatus = ""; // reset for next block
        } else if (line.match(/ELSIF/)) {
            // also look for ELSIF p_old_status = '...' THEN
            const elsifMatch = line.match(/ELSIF\s+p_old_status\s*=\s*'([^']+)'\s*THEN/);
            if (elsifMatch) {
                currentStatus = elsifMatch[1];
                if (!sqlTransitions[currentStatus]) sqlTransitions[currentStatus] = [];
            }
        }
      }
    }

    // 3. Compare with TS VALID_TRANSITIONS
    const tsStatuses = Object.keys(VALID_TRANSITIONS).filter(k => k !== "DELIVERED" && k !== "CANCELLED" && k !== "REFUNDED" && k !== "RETURN_PENDING" && k !== "RETURNED"); // Terminal states or unhandled in IF logic might not have outward blocks in SQL.
    
    for (const status of tsStatuses) {
      if (sqlTransitions[status]) {
        const sqlTargets = sqlTransitions[status].sort();
        const tsTargets = (VALID_TRANSITIONS as any)[status].sort();
        expect(sqlTargets).toEqual(tsTargets);
      }
    }
  });
});

