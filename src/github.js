const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const BASE = "https://api.github.com";

const headers = TOKEN && TOKEN !== "undefined"
  ? { Authorization: `token ${TOKEN}`, Accept: "application/vnd.github+json" }
  : { Accept: "application/vnd.github+json" };

export async function getIssues(repo) {
  const res = await fetch(`${BASE}/repos/${repo}/issues?state=open&per_page=50`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function getCommits(repo, per_page = 10) {
  const res = await fetch(`${BASE}/repos/${repo}/commits?per_page=${per_page}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function addLabel(repo, issueNumber, label) {
  const authHeaders = TOKEN && TOKEN !== "undefined"
    ? { ...headers, "Content-Type": "application/json" }
    : { ...headers, "Content-Type": "application/json" };
  const res = await fetch(`${BASE}/repos/${repo}/issues/${issueNumber}/labels`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ labels: [label] }),
  });
  return res.ok;
}

export async function getRepoCommitComments(repo) {
  const res = await fetch(`${BASE}/repos/${repo}/comments?per_page=100`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function getIssueComments(repo, number) {
  const res = await fetch(`${BASE}/repos/${repo}/issues/${number}/comments?per_page=100`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function postIssueComment(repo, number, body) {
  const res = await fetch(`${BASE}/repos/${repo}/issues/${number}/comments`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return res.ok;
}

export async function getSubIssues(repo, number) {
  const res = await fetch(`${BASE}/repos/${repo}/issues/${number}/sub_issues?per_page=50`, {
    headers: { ...headers, Accept: "application/vnd.github+json" }
  });
  if (!res.ok) return [];
  return res.json();
}
