import { readFile } from "node:fs/promises";
import path from "node:path";
import { siteContent, type SiteContent } from "./brand-content";

const CONTENT_FILE = path.join(process.cwd(), "content", "homepage.json");

export async function getHomepageContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(CONTENT_FILE, "utf8");
    return JSON.parse(raw) as SiteContent;
  } catch {
    return siteContent;
  }
}

export { CONTENT_FILE };
