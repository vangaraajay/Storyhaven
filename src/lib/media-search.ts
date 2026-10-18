export type MediaType = "book" | "movie" | "album";

export async function searchMediaCover(
  type: MediaType,
  title: string,
): Promise<string | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  try {
    if (type === "book") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=1`,
        {
          signal: controller.signal,
          next: { revalidate: 86400 },
        },
      );
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      return coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : null;
    }

    if (type === "movie") {
      // Official public IMDb suggestions API (no API key needed, high-res posters)
      const cleanLower = cleanTitle.toLowerCase();
      const firstChar = cleanLower[0] || "a";
      const slug = cleanLower
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://v3.sg.media-imdb.com/suggestion/${encodeURIComponent(firstChar)}/${encodeURIComponent(slug)}.json`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          next: { revalidate: 86400 },
        },
      );
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const items = data?.d ?? [];

      // 1. Check for exact title match with image
      for (const item of items) {
        const img = item?.i?.imageUrl;
        if (img && typeof item?.l === "string" && item.l.toLowerCase() === cleanLower) {
          return img;
        }
      }

      // 2. Check for feature film / movie
      for (const item of items) {
        const img = item?.i?.imageUrl;
        if (img && (item?.q === "feature" || item?.q === "movie" || item?.q === "TV movie")) {
          return img;
        }
      }

      // 3. Fallback to first item with valid image
      for (const item of items) {
        const img = item?.i?.imageUrl;
        if (img) {
          return img;
        }
      }

      return null;
    }

    if (type === "album") {
      // iTunes Search API for crisp album art
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=album&limit=1`,
        {
          signal: controller.signal,
          next: { revalidate: 86400 },
        },
      );
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const artwork = data?.results?.[0]?.artworkUrl100;
      if (!artwork) return null;
      return artwork.replace("100x100bb.jpg", "600x600bb.jpg");
    }
  } catch (err) {
    // Graceful fallback to null on abort, network timeout, or parse failure
    return null;
  }

  return null;
}
