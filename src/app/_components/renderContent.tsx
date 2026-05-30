/**
 * renderContent — parses a string of text and returns an array of React nodes
 * where hashtags (#word), mentions (@user), and URLs (https://...) are rendered
 * as clickable styled elements.
 *
 * Hashtags → navigate to /search?q=#word
 * Mentions → navigate to /profile/user
 * URLs     → open in a new tab via <a> with rel="noopener noreferrer"
 *
 * Router is passed in rather than using a hook so this function works
 * in contexts where hooks are unavailable (e.g. inside a callback).
 */

// Import only the type so we don't actually invoke the hook here
import type { useRouter } from "next/navigation";

export function renderContent(text: string, router: ReturnType<typeof useRouter>) {
  // Accumulator for text segments and interactive elements
  const parts: React.ReactNode[] = [];
  // Regex: matches #word, @user, or http(s)://... URLs
  const pattern = /(#\w+|@\w+|https?:\/\/\S+)/g;
  let lastIndex = 0;
  let match;

  // Walk through all matches in the input text
  while ((match = pattern.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const i = parts.length;

    if (matched.startsWith("#")) {
      // Hashtag → clickable span that navigates to search
      parts.push(
        <span
          key={i}
          onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(matched)}`); }}
          className="text-[rgb(29,155,240)] hover:underline cursor-pointer"
        >
          {matched}
        </span>
      );
    } else if (matched.startsWith("@")) {
      // Mention → clickable span that navigates to the user's profile
      parts.push(
        <span
          key={i}
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${matched.slice(1)}`); }}
          className="text-[rgb(29,155,240)] hover:underline cursor-pointer"
        >
          {matched}
        </span>
      );
    } else {
      // URL → anchor tag opening in a new tab
      parts.push(
        <a
          key={i}
          href={matched}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[rgb(29,155,240)] hover:underline"
        >
          {matched}
        </a>
      );
    }

    // Advance the slice cursor past this match
    lastIndex = match.index + matched.length;
  }

  // Append any remaining plain text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Return the assembled parts, or the original string if nothing matched
  return parts.length > 0 ? parts : text;
}
