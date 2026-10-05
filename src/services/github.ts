/**
 * GitHub Service & Deterministic README Intelligence
 * Handles public repository fetching, latest commits, milestones, and local caching.
 */

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorDate: string;
  url: string;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description?: string;
  state: "open" | "closed";
  openIssues: number;
  closedIssues: number;
  dueOn?: string;
  url: string;
}

export interface ReadmeTask {
  text: string;
  completed: boolean;
}

export interface ReadmeSection {
  title: string;
  tasks: ReadmeTask[];
}

export interface ReadmeIntelligence {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  sections: ReadmeSection[];
  sourceNote: string;
}

export interface CachedGitHubData {
  owner: string;
  repo: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  htmlUrl: string;
  starsCount?: number;
  latestCommit?: GitHubCommit;
  milestones: GitHubMilestone[];
  readmeIntelligence?: ReadmeIntelligence;
  cachedAt: string;
}

const CACHE_PREFIX = "iitm_gh_cache_";
const memoryCacheFallback = new Map<string, string>();

/**
 * Parses diverse GitHub URL formats into { owner, repo }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Format 1: owner/repo
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return { owner, repo: repo.replace(/\.git$/, "") };
  }

  // Format 2: https://github.com/owner/repo or http://
  const httpMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/.*)?$/,
  );
  if (httpMatch) {
    return { owner: httpMatch[1], repo: httpMatch[2] };
  }

  // Format 3: git@github.com:owner/repo.git
  const sshMatch = trimmed.match(
    /^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/,
  );
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

/**
 * Deterministically parses Markdown text to extract task lists and headings
 * Explicitly labeled as README-derived intelligence.
 */
export function parseReadmeIntelligence(markdown: string): ReadmeIntelligence {
  const lines = markdown.split(/\r?\n/);
  const sections: ReadmeSection[] = [];
  let currentSection: ReadmeSection = { title: "Overview", tasks: [] };

  let totalTasks = 0;
  let completedTasks = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match Markdown headers (# Header)
    const headerMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      if (currentSection.tasks.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: headerMatch[1].trim(), tasks: [] };
      continue;
    }

    // Match task checkbox: - [x] task or - [ ] task (also * [x])
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const isCompleted = taskMatch[1].toLowerCase() === "x";
      const taskText = taskMatch[2].trim();

      currentSection.tasks.push({
        text: taskText,
        completed: isCompleted,
      });

      totalTasks++;
      if (isCompleted) {
        completedTasks++;
      }
    }
  }

  if (currentSection.tasks.length > 0) {
    sections.push(currentSection);
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    percentage,
    sections,
    sourceNote: "README-derived intelligence only; does not alter official TMA V2 requirements.",
  };
}

/**
 * Local cache read
 */
export function getGitHubCache(owner: string, repo: string): CachedGitHubData | null {
  const key = `${CACHE_PREFIX}${owner.toLowerCase()}_${repo.toLowerCase()}`;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as CachedGitHubData;
    }
  } catch {
    // Fall back to memory
  }
  const mem = memoryCacheFallback.get(key);
  return mem ? (JSON.parse(mem) as CachedGitHubData) : null;
}

/**
 * Local cache write
 */
export function setGitHubCache(owner: string, repo: string, data: CachedGitHubData): void {
  const key = `${CACHE_PREFIX}${owner.toLowerCase()}_${repo.toLowerCase()}`;
  const jsonStr = JSON.stringify(data);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, jsonStr);
    }
  } catch {
    // Ignore quota issues
  }
  memoryCacheFallback.set(key, jsonStr);
}

/**
 * Clears local cache for repository
 */
export function clearGitHubCache(owner: string, repo: string): void {
  const key = `${CACHE_PREFIX}${owner.toLowerCase()}_${repo.toLowerCase()}`;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore
  }
  memoryCacheFallback.delete(key);
}

/**
 * Fetches public GitHub repository metadata, latest commit, milestones, and README.
 * Falls back to existing cache if network fails.
 */
export async function fetchGitHubRepoDetails(
  owner: string,
  repo: string,
  token?: string,
): Promise<CachedGitHubData> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  try {
    // 1. Repo info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
      }
      if (repoRes.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Please provide an optional personal access token.",
        );
      }
      throw new Error(`GitHub API error (${repoRes.status}): ${repoRes.statusText}`);
    }
    const repoData = await repoRes.json();

    // 2. Latest commit
    let latestCommit: GitHubCommit | undefined;
    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
        { headers },
      );
      if (commitRes.ok) {
        const commits = await commitRes.json();
        if (Array.isArray(commits) && commits.length > 0) {
          const c = commits[0];
          latestCommit = {
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0],
            authorName: c.commit.author?.name || c.author?.login || "Unknown",
            authorDate: c.commit.author?.date || new Date().toISOString(),
            url: c.html_url,
          };
        }
      }
    } catch {
      // Commit fetch optional
    }

    // 3. Milestones
    let milestones: GitHubMilestone[] = [];
    try {
      const milesRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/milestones?state=all&per_page=10`,
        { headers },
      );
      if (milesRes.ok) {
        const milesData = await milesRes.json();
        if (Array.isArray(milesData)) {
          milestones = milesData.map((m: any) => ({
            id: m.id,
            number: m.number,
            title: m.title,
            description: m.description,
            state: m.state,
            openIssues: m.open_issues,
            closedIssues: m.closed_issues,
            dueOn: m.due_on,
            url: m.html_url,
          }));
        }
      }
    } catch {
      // Milestones optional
    }

    // 4. README intelligence
    let readmeIntelligence: ReadmeIntelligence | undefined;
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        credentials: "omit",
        headers,
      });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        if (readmeData.content) {
          const decoded = decodeURIComponent(escape(atob(readmeData.content.replace(/\s/g, ""))));
          readmeIntelligence = parseReadmeIntelligence(decoded);
        }
      }
    } catch {
      // README optional
    }

    const cachedData: CachedGitHubData = {
      owner,
      repo,
      fullName: repoData.full_name || `${owner}/${repo}`,
      description: repoData.description || "",
      defaultBranch: repoData.default_branch || "main",
      htmlUrl: repoData.html_url || `https://github.com/${owner}/${repo}`,
      starsCount: repoData.stargazers_count,
      latestCommit,
      milestones,
      readmeIntelligence,
      cachedAt: new Date().toISOString(),
    };

    setGitHubCache(owner, repo, cachedData);
    return cachedData;
  } catch (err: any) {
    // If offline or network error, check if cache exists
    const existing = getGitHubCache(owner, repo);
    if (existing) {
      return existing;
    }
    throw err;
  }
}
