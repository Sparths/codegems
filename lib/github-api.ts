// lib/github-api.ts
interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

interface GitHubRepoData {
  _rateLimit: any;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  languages_url: string;
}

/**
 * Fetches a GitHub repository's information
 * @param repoUrl GitHub repository URL
 * @returns Repository data or null if fetching failed
 */
export async function fetchGitHubRepository(repoUrl: string): Promise<GitHubRepoData | null> {
  try {
    // Convert GitHub URL to API URL (github.com/user/repo → api.github.com/repos/user/repo)
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    if (urlParts.length < 2) return null;
    
    const owner = urlParts[0];
    const repo = urlParts[1];
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeGems-Updater'
      }
    });
    
    // Extract rate limit info
    const rateLimit = parseRateLimitFromHeaders(response.headers);
    
    if (!response.ok) {
      console.error(`Error fetching repo data: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Return both the data and rate limit info
    return {
      ...data,
      _rateLimit: rateLimit
    } as GitHubRepoData & { _rateLimit: GitHubRateLimit };
  } catch (error) {
    console.error("Error fetching GitHub repository:", error);
    return null;
  }
}

/**
 * Fetches the languages used in a repository
 * @param languagesUrl The GitHub API URL for languages
 * @returns Object mapping language names to byte counts
 */
export async function fetchRepositoryLanguages(languagesUrl: string): Promise<Record<string, number> & { _rateLimit?: GitHubRateLimit }> {
  try {
    const response = await fetch(languagesUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeGems-Updater'
      }
    });
    
    // Extract rate limit info
    const rateLimit = parseRateLimitFromHeaders(response.headers);
    
    if (!response.ok) {
      console.error(`Error fetching languages: ${response.status} ${response.statusText}`);
      return {};
    }
    
    const data = await response.json();
    
    // Return both the data and rate limit info
    return {
      ...data,
      _rateLimit: rateLimit
    };
  } catch (error) {
    console.error("Error fetching repository languages:", error);
    return {};
  }
}

/**
 * Extracts rate limit information from response headers
 */
export function parseRateLimitFromHeaders(headers: Headers): GitHubRateLimit {
  return {
    limit: parseInt(headers.get('x-ratelimit-limit') || '60'),
    remaining: parseInt(headers.get('x-ratelimit-remaining') || '0'),
    reset: parseInt(headers.get('x-ratelimit-reset') || '0'),
  };
}