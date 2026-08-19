export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function menuItemSchemaHint(message: string) {
  if (message.includes("category") || message.includes("is_available")) {
    return `${message} Run supabase-owner-fix.sql in Supabase SQL Editor.`;
  }

  return message;
}
