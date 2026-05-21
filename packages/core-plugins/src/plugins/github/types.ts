/** GitHub API response types */

export interface GitHubUser {
  login: string;
  id: number;
}

export interface GitHubLabel {
  name: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  created_at: string;
  state: string;
  pull_request?: { url: string };
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  created_at: string;
  state: string;
  merged: boolean;
}

export interface GitHubReviewComment {
  id: number;
  body: string;
  user: GitHubUser;
  path: string;
  created_at: string;
  diff_hunk: string;
}

export type GitHubContentType = "issue" | "pull-request";
