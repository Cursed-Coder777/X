/**
 * renderContent — parses text and renders hashtags, mentions, and URLs
 * as clickable elements with X-style blue links.
 *
 * Pattern matching:
 *   #word        → navigates to /search?q=%23word
 *   @user        → navigates to /profile/user
 *   https://...  → opens in a new tab via <a target="_blank">
 *
 * The router is passed as a parameter (not via hook) so this utility
 * can be used outside of React components or in callbacks.
 */

// Import only the type to avoid invoking the hook here
import type { useRouter } from "next/navigation";

export function renderContent(text: string, router: ReturnType<typeof useRouter>) {
  // Accumulator for text segments and interactive React nodes
  const parts: React.ReactNode[] = [];
  // Regex matches hashtags (#word), mentions (@user), and URLs (http(s)://...)
  const pattern = /(#\w+|@\w+|https?:\/\/\S+)/g;
  let lastIndex = 0;
  let match;

  // Iterate through all matches in the input text
  while ((match = pattern.exec(text)) !== null) {
    // Append any plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const i = parts.length;

    if (matched.startsWith("#")) {
      // Hashtag → blue clickable span that navigates to search
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
      // Mention → blue clickable span that navigates to the user's profile
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
      // URL → anchor tag that opens in a new tab
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

    // Move the slice cursor past the current match
    lastIndex = match.index + matched.length;
  }

  // Append any remaining plain text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Return the assembled parts, or the original string if nothing matched
  return parts.length > 0 ? parts : text;
}
