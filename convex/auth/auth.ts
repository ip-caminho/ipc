import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { WhatsAppOTP } from "./phoneOTP";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, WhatsAppOTP],
  session: {
    inactiveDurationMs: TWELVE_HOURS_MS,
    totalDurationMs: THIRTY_DAYS_MS,
  },
});
