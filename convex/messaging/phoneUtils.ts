/**
 * Messaging Phone Number Utilities
 * Single source of truth for phone number normalization
 *
 * Brazilian phone format:
 * - Country code: 55
 * - Area code (DDD): 2 digits (11-99)
 * - Number: 8-9 digits (9 for mobile, 8 for landline)
 *
 * Examples:
 * - E164: +5511999999999
 * - Display: (11) 99999-9999
 */

/**
 * Remove all non-digit characters except +
 */
function stripNonDigits(phone: string, keepPlus = false): string {
  if (keepPlus) {
    return phone.replace(/[^\d+]/g, "");
  }
  return phone.replace(/\D/g, "");
}

/**
 * Remove WhatsApp JID suffix (@s.whatsapp.net or @c.us)
 */
function removeJidSuffix(phone: string): string {
  if (phone.includes("@")) {
    return phone.split("@")[0];
  }
  return phone;
}

/**
 * Normalize phone to E164 format (+5511999999999)
 * Used for: storage, auth, database queries
 */
export function normalizeToE164(phone: string): string {
  // Remove JID suffix if present
  let cleaned = removeJidSuffix(phone);

  // Strip non-digits but keep +
  cleaned = stripNonDigits(cleaned, true);

  // If already starts with +, validate and return
  if (cleaned.startsWith("+")) {
    // Ensure it has country code
    if (cleaned.startsWith("+55")) {
      return cleaned;
    }
    // Other country codes - return as-is
    return cleaned;
  }

  // If starts with 55, add +
  if (cleaned.startsWith("55")) {
    return `+${cleaned}`;
  }

  // Assume Brazilian number, add +55
  return `+55${cleaned}`;
}

/**
 * Normalize phone for comparison (local number without country code)
 * Used for: matching phones across different formats
 */
export function normalizeForComparison(phone: string): string {
  // Get digits only
  let digits = stripNonDigits(removeJidSuffix(phone));

  // Remove Brazil country code (55) if present at start
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  return digits;
}

/**
 * Validate if phone looks like a valid Brazilian mobile number
 */
export function isValidBrazilianMobile(phone: string): boolean {
  const digits = stripNonDigits(phone);

  let number = digits;
  if (number.startsWith("55")) {
    number = number.slice(2);
  }

  // Brazilian mobile: 2 digit DDD + 9 digit number (starts with 9)
  if (number.length === 11 && number[2] === "9") {
    return true;
  }

  // Some older formats might have 10 digits
  if (number.length === 10) {
    return true;
  }

  return false;
}

/**
 * Format phone for display: (11) 99999-9999
 */
export function formatForDisplay(phone: string): string {
  const digits = stripNonDigits(phone);

  let number = digits;
  if (number.startsWith("55")) {
    number = number.slice(2);
  }

  if (number.length === 11) {
    // Mobile: (XX) 9XXXX-XXXX
    return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
  } else if (number.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
  }

  return phone;
}

/**
 * Compare two phone numbers for equality
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizeForComparison(phone1) === normalizeForComparison(phone2);
}
