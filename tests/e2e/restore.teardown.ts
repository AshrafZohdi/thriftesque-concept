import { execSync } from "node:child_process";
import { test } from "@playwright/test";

// Puts the local database back to the seed after the tests that change data.
test("restore the seed", () => {
  execSync("npm run seed", { stdio: "pipe", timeout: 120_000 });
});
