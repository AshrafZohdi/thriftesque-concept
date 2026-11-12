// Team accounts for the LOCAL database only (the seed refuses any other host). Used by the seed and the e2e tests.
// Never create these on the production project; real team accounts are made by hand (runbook).
export const DEV_TEAM = { email: "team@thriftesque.test", password: "local-only-team-password", name: "Local team" };
export const DEV_STRANGER = { email: "stranger@thriftesque.test", password: "local-only-stranger-password" };
