import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TrainingPeaksClient } from "../../src/index.js";
import { getUser, getAthleteId } from "../../src/mcp/tools/user.js";
import { createClient } from "./setup.js";

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;

describe.skipIf(!hasCredentials)(
  "User",
  () => {
    let client: TrainingPeaksClient;

    beforeAll(async () => {
      client = await createClient();
    }, 120000);

    afterAll(async () => {
      await client.close();
    });

    describe("API", () => {
      it("getUser returns user profile", async () => {
        const user = await client.getUser();

        expect(user).toBeDefined();
        expect(user.id).toBeTypeOf("number");
        expect(user.athleteId).toBeTypeOf("number");
        expect(user.email).toBeTypeOf("string");
        expect(user.firstName).toBeTypeOf("string");
        expect(user.lastName).toBeTypeOf("string");
      });

      it("getAthleteId returns numeric ID", async () => {
        const athleteId = await client.getAthleteId();

        expect(athleteId).toBeTypeOf("number");
        expect(athleteId).toBeGreaterThan(0);
      });
    });

    describe("MCP Tools", () => {
      it("get_user returns JSON with id, email, firstName", async () => {
        const raw = await getUser(client);
        const data = JSON.parse(raw);

        expect(data.id).toBeTypeOf("number");
        expect(data.email).toBeTypeOf("string");
        expect(data.firstName).toBeTypeOf("string");
      });

      it("get_athlete_id returns athleteId > 0", async () => {
        const raw = await getAthleteId(client);
        const data = JSON.parse(raw);

        expect(data.athleteId).toBeTypeOf("number");
        expect(data.athleteId).toBeGreaterThan(0);
      });
    });
  },
  60000,
);
