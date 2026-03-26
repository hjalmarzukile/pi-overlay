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
