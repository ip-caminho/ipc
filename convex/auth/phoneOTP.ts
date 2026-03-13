import { Phone } from "@convex-dev/auth/providers/Phone";
import { alphabet, generateRandomString } from "oslo/crypto";
import { normalizeToE164 } from "../messaging/phoneUtils";
import { messaging } from "../messaging/service";

export const WhatsAppOTP = Phone({
  id: "whatsapp-otp",
  maxAge: 60 * 5,

  async generateVerificationToken() {
    // HARDCODED bypass: only in non-production — never configurable by env var
    if (process.env.NODE_ENV !== "production") {
      console.log("[Bypass] Dev mode — auto-verification enabled");
      return "BYPASS";
    }
    return generateRandomString(6, alphabet("0-9"));
  },

  normalizeIdentifier(phone: string) {
    return normalizeToE164(phone);
  },

  async sendVerificationRequest({ identifier: phone, token }) {
    // HARDCODED bypass: only in non-production
    if (process.env.NODE_ENV !== "production") {
      console.log("[Bypass] Dev mode — skipping WhatsApp send");
      return;
    }

    console.log("[WhatsApp OTP] Sending to:", phone);
    try {
      await messaging.sendOTP(phone, token);
    } catch (error) {
      console.error("[WhatsApp OTP] Error:", error);
      throw new Error(
        `Could not send WhatsApp verification: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async authorize(params: unknown, account: unknown) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    const typedParams = params as { phone?: string };
    const typedAccount = account as { providerAccountId?: string };
    if (!typedParams.phone || !typedAccount.providerAccountId) {
      throw new Error("Missing phone number");
    }
    const normalizedParamPhone = normalizeToE164(typedParams.phone);
    const normalizedAccountPhone = normalizeToE164(typedAccount.providerAccountId);
    if (normalizedParamPhone !== normalizedAccountPhone) {
      throw new Error("Phone number mismatch");
    }
  },
});
