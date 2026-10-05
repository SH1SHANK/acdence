import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenFile = path.resolve(__dirname, "../../.notion_token_temp");
if (!fs.existsSync(tokenFile)) {
  throw new Error(`Notion token file not found at ${tokenFile}`);
}
export const NOTION_TOKEN = fs.readFileSync(tokenFile, "utf8").trim();
export const NOTION_VERSION = "2022-06-28";
export const PARENT_PAGE_ID = "3e60c9fb-fc81-802b-8df9-f80b9c84b83c";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function notionRequest(endpoint, options = {}, retries = 5) {
  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://api.notion.com/v1/${endpoint.replace(/^\//, "")}`;
  const headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Throttle 350ms to strictly comply with 3 req/sec rate limit
      await sleep(350);
      const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "2", 10);
        console.warn(
          `[429 Rate Limit] Retrying after ${retryAfter}s (attempt ${attempt}/${retries})...`,
        );
        await sleep(retryAfter * 1000 + 500);
        continue;
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(`[Notion API ${res.status}] ${res.statusText}: ${JSON.stringify(json)}`);
      }
      return json;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Attempt ${attempt} Error] ${err.message}. Retrying in 1.5s...`);
      await sleep(1500);
    }
  }
}

export async function createPage(parent, properties = {}, children = []) {
  const body = {
    parent,
    properties,
  };
  if (children && children.length > 0) {
    // Notion API allows up to 100 children in createPage
    body.children = children.slice(0, 100);
  }
  const page = await notionRequest("/pages", {
    method: "POST",
    body,
  });

  // If more than 100 children, append in batches of 100
  if (children && children.length > 100) {
    for (let i = 100; i < children.length; i += 100) {
      const chunk = children.slice(i, i + 100);
      await appendBlockChildren(page.id, chunk);
    }
  }

  return page;
}

export async function appendBlockChildren(blockId, children) {
  for (let i = 0; i < children.length; i += 100) {
    const chunk = children.slice(i, i + 100);
    await notionRequest(`/blocks/${blockId}/children`, {
      method: "PATCH",
      body: { children: chunk },
    });
  }
}

export async function createDatabase(parent, title, properties) {
  return notionRequest("/databases", {
    method: "POST",
    body: {
      parent,
      title: [{ type: "text", text: { content: title } }],
      properties,
    },
  });
}

export async function updateDatabase(databaseId, properties) {
  return notionRequest(`/databases/${databaseId}`, {
    method: "PATCH",
    body: {
      properties,
    },
  });
}

export async function queryDatabase(databaseId, filter, sorts) {
  const results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const body = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (startCursor) body.start_cursor = startCursor;

    const data = await notionRequest(`/databases/${databaseId}/query`, {
      method: "POST",
      body,
    });
    results.push(...data.results);
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }
  return results;
}

export function truncateText(str, maxLength = 1950) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function textBlock(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(content) },
        },
      ],
    },
  };
}

export function headingBlock(text, level = 2) {
  const type = level === 1 ? "heading_1" : level === 2 ? "heading_2" : "heading_3";
  return {
    object: "block",
    type,
    [type]: {
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(text) },
        },
      ],
    },
  };
}

export function bulletBlock(content) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(content) },
        },
      ],
    },
  };
}

export function calloutBlock(content, icon = "📌") {
  return {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: icon },
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(content) },
        },
      ],
    },
  };
}

export function codeBlock(code, language = "plain text") {
  return {
    object: "block",
    type: "code",
    code: {
      language,
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(code) },
        },
      ],
    },
  };
}

export function markdownToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line) continue;

    if (line.startsWith("### ")) {
      blocks.push(headingBlock(line.slice(4), 3));
    } else if (line.startsWith("## ")) {
      blocks.push(headingBlock(line.slice(3), 2));
    } else if (line.startsWith("# ")) {
      blocks.push(headingBlock(line.slice(2), 1));
    } else if (line.startsWith("> ")) {
      blocks.push(calloutBlock(line.slice(2), "💡"));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push(bulletBlock(line.slice(2)));
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push(bulletBlock(line.replace(/^\d+\.\s*/, "")));
    } else {
      blocks.push(textBlock(line));
    }
  }

  return blocks;
}
