const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const BASE = "https://api.github.com";

const headers = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github+json",
};

export async function getIssues(repo, labels = "") {
  const url = `${BASE}/repos/${repo}/issues?state=open&per_page=50${labels ? `&labels=${labels}` : ""}`;
  const res = await fetch(url, { headers });
  return res.json();
}

export async function getClosedIssues(repo) {
  const res = await fetch(`${BASE}/repos/${repo}/issues?state=closed&per_page=20`, { headers });
  return res.json();
}

export async function addLabel(repo, issueNumber, label) {
  await fetch(`${BASE}/repos/${repo}/issues/${issueNumber}/labels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ labels: [label] }),
  });
}

export async function getRepoContents(repo, path) {
  const res = await fetch(`${BASE}/repos/${repo}/contents/${path}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function getCommits(repo, per_page = 10) {
  const res = await fetch(`${BASE}/repos/${repo}/commits?per_page=${per_page}`, { headers });
  return res.json();
}
