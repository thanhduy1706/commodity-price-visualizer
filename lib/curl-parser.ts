/**
 * Extracts cookies from a cURL command
 * Supports both -b and --cookie flags
 */
export function extractCookiesFromCurl(curlCommand: string): string | null {
  if (!curlCommand || typeof curlCommand !== "string") {
    return null
  }

  // Remove line breaks and extra spaces
  const normalized = curlCommand
    .replace(/\\\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")

  // Try to find -b 'cookies' or --cookie 'cookies'
  const patterns = [
    /-b\s+['"]([^'"]+)['"]/, // -b 'cookies'
    /--cookie\s+['"]([^'"]+)['"]/, // --cookie 'cookies'
    /-b\s+([^\s]+)/, // -b cookies (no quotes)
    /--cookie\s+([^\s]+)/, // --cookie cookies (no quotes)
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Checks if the input looks like a cURL command
 */
export function isCurlCommand(input: string): boolean {
  if (!input || typeof input !== "string") {
    return false
  }

  const normalized = input.trim().toLowerCase()
  return normalized.startsWith("curl ") || normalized.includes("curl 'http")
}

/**
 * Extracts cookies from input - either direct cookies or from cURL
 */
export function extractCookies(input: string): string {
  if (!input) {
    return ""
  }

  // Check if it's a cURL command
  if (isCurlCommand(input)) {
    const extracted = extractCookiesFromCurl(input)
    return extracted || input // Return original if extraction fails
  }

  // Otherwise return as-is (already cookies)
  return input.trim()
}
