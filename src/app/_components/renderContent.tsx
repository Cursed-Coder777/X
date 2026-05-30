import type { useRouter } from "next/navigation";

export function renderContent(text: string, router: ReturnType<typeof useRouter>) {
  const parts: React.ReactNode[] = [];
  const pattern = /(#\w+|@\w+|https?:\/\/\S+)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const i = parts.length;
    if (matched.startsWith("#")) {
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
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
