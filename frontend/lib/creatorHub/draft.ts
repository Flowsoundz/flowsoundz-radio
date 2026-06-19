export type CreatorDraft = {
  artistName?: string;
  songTitle?: string;
  genre?: string;
  vibe?: string;
  artistType?: string;
  description?: string;
  coreThemes?: string;
  songIdea?: string;
  mood?: string;
  lyricSnippet?: string;
  contactName?: string;
  email?: string;
  songLink?: string;
  streamingLink?: string;
  coverArtLink?: string;
  socialLink?: string;
  producerCredit?: string;
  aiUsed?: string;
  aiTool?: string;
  versionType?: string;
  notes?: string;
};

const STORAGE_KEY = "fsz-creator-draft-v1";

export function readCreatorDraft(): CreatorDraft {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as CreatorDraft;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function mergeCreatorDraft(partial: CreatorDraft): CreatorDraft {
  const next = {
    ...readCreatorDraft(),
    ...partial,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write failures.
    }
  }

  return next;
}

