import { useState, useEffect } from "react";
import { getIssues, addLabel, getCommits, getRepoCommitComments } from "./github";
import "./App.css";

const PROJECT_REPO = "hjalmarzukile/AInterview_litreview";
const TASK_BOARD_REPO = "hjalmarzukile/task-board";
const GH = "https://github.com";

const NEW_EPIC      = `${GH}/${PROJECT_REPO}/issues/new?template=epic.yml`;
const NEW_TASK      = `${GH}/${PROJECT_REPO}/issues/new?template=task.yml`;
const NEW_BOARD_TASK = `${GH}/${TASK_BOARD_REPO}/issues/new`;

function tag(name) {
  const map = {
    epic: "tag-epic", task: "tag-task",
    "pi-approve": "tag-approve", "self-approve": "tag-self",
    "awaiting-pi-approval": "tag-waiting", "pi-approved": "tag-done",
    blocked: "tag-blocked",
  };
  return `tag ${map[name] || "tag-default"}`;
}

function parseSummary(comments, sha) {
  const c = comments.find(
    (c) => c.commit_id === sha && c.body.includes("<!-- commit-summary -->")
  );
  if (!c) return null;
  const text = c.body.replace("<!-- commit-summary -->", "").replace("**Summary:**", "").trim();
  return { text, url: c.html_url, id: c.id };
}

function IssueCard({ issue, onApprove }) {
  const needsApproval = issue.labels.some((l) => l.name === "awaiting-pi-approval");
  return (
    <div className={`card ${needsApproval ? "approval" : ""}`}>
      <div className="card-row">
        <span className="card-number">#{issue.number}</span>
        <a href={issue.html_url} target="_blank" rel="noreferrer" className="card-title">
          {issue.title}
        </a>
        {issue.assignee && (
          <img className="card-avatar" src={issue.assignee.avatar_url}
            alt={issue.assignee.login} title={`@${issue.assignee.login}`} />
        )}
      </div>
      <div className="card-meta">
        {issue.labels.map((l) => (
          <span key={l.name} className={tag(l.name)}>{l.name}</span>
        ))}
        {needsApproval && (
          <button className="btn-approve" style={{ marginLeft: "auto" }}
            onClick={() => onApprove(issue.number)}>
            Approve &amp; close
          </button>
        )}
      </div>
    </div>
  );
}

function CommitRow({ commit, summary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="commit-block">
      <div className="commit-row" onClick={() => summary && setExpanded((e) => !e)}
        style={{ cursor: summary ? "pointer" : "default" }}>
        <a href={commit.html_url} target="_blank" rel="noreferrer"
          className="commit-sha" onClick={(e) => e.stopPropagation()}>
          {commit.sha.slice(0, 7)}
        </a>
        <span className="commit-msg">{commit.commit.message.split("\n")[0]}</span>
        <span className="commit-author">{commit.commit.author.name}</span>
        <span className="commit-summary-indicator">
          {summary
            ? <span className="summary-dot has-summary" title="Has summary">●</span>
            : <span className="summary-dot no-summary" title="No summary yet">○</span>}
        </span>
      </div>
      {expanded && summary && (
        <div className="summary-body">
          <p>{summary.text}</p>
          <a href={summary.url} target="_blank" rel="noreferrer" className="summary-link">
            View on GitHub →
          </a>
        </div>
      )}
    </div>
  );
}

function CommitFeed({ commits, comments }) {
  if (!commits.length) return <p className="empty">No commits yet.</p>;
  return (
    <div className="commit-list">
      {commits.slice(0, 15).map((c) => (
        <CommitRow key={c.sha} commit={c} summary={parseSummary(comments, c.sha)} />
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [issues, setIssues] = useState([]);
  const [boardIssues, setBoardIssues] = useState([]);
  const [commits, setCommits] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [iss, board, cms, coms] = await Promise.all([
      getIssues(PROJECT_REPO),
      getIssues(TASK_BOARD_REPO),
      getCommits(PROJECT_REPO, 15),
      getRepoCommitComments(PROJECT_REPO),
    ]);
    setIssues(iss);
    setBoardIssues(board);
    setCommits(cms);
    setComments(coms);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (n) => {
    await addLabel(PROJECT_REPO, n, "pi-approved");
    await load();
  };

  const epics    = issues.filter((i) => i.labels.some((l) => l.name === "epic"));
  const tasks    = issues.filter((i) => i.labels.some((l) => l.name === "task"));
  const pending  = issues.filter((i) => i.labels.some((l) => l.name === "awaiting-pi-approval"));
  const available = boardIssues.filter((i) => i.labels.some((l) => l.name === "available"));

  const summarised = commits.filter((c) => parseSummary(comments, c.sha)).length;

  const nav = [
    { id: "overview", label: "Overview" },
    { id: "epics",    label: "Epics",   count: epics.length },
    { id: "tasks",    label: "Tasks",   count: tasks.length },
    { id: "board",    label: "Board",   count: available.length },
    { id: "commits",  label: "Commits", count: commits.length ? `${summarised}/${commits.length}` : null },
  ];

  return (
    <div className="layout">
      <header className="header">
        <span className="header-title">Research OS</span>
        <span className="header-repo">{PROJECT_REPO}</span>
        <div className="header-spacer" />
        {pending.length > 0 && (
          <span className="badge-approval">{pending.length} pending approval</span>
        )}
        <button className="btn" onClick={load}>Refresh</button>
      </header>

      <nav className="sidebar">
        <span className="nav-section">Navigate</span>
        {nav.map((n) => (
          <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`}
            onClick={() => setTab(n.id)}>
            {n.label}
            {n.count != null && <span className="nav-count">{n.count}</span>}
          </button>
        ))}
        <span className="nav-section" style={{ marginTop: 24 }}>Create</span>
        <a href={NEW_EPIC} target="_blank" rel="noreferrer" className="nav-item">New epic</a>
        <a href={NEW_TASK} target="_blank" rel="noreferrer" className="nav-item">New task</a>
        <a href={NEW_BOARD_TASK} target="_blank" rel="noreferrer" className="nav-item">Post to board</a>
      </nav>

      <main className="main">
        {loading && <div className="loading">Loading…</div>}

        {!loading && tab === "overview" && (
          <>
            {pending.length > 0 && (
              <section>
                <div className="section-header">
                  <span className="section-title urgent">Awaiting approval</span>
                </div>
                {pending.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
                <div className="divider" />
              </section>
            )}
            <section style={{ marginBottom: 32 }}>
              <div className="section-header">
                <span className="section-title">Open epics</span>
                <a href={NEW_EPIC} target="_blank" rel="noreferrer" className="btn">+ New epic</a>
              </div>
              {epics.length === 0
                ? <p className="empty">No open epics.</p>
                : epics.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
            </section>
            <section>
              <div className="section-header">
                <span className="section-title">Recent commits</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  click a summarised commit to expand
                </span>
              </div>
              <CommitFeed commits={commits.slice(0, 5)} comments={comments} />
            </section>
          </>
        )}

        {!loading && tab === "epics" && (
          <>
            <div className="section-header">
              <span className="section-title">Epics</span>
              <a href={NEW_EPIC} target="_blank" rel="noreferrer" className="btn">+ New epic</a>
            </div>
            {epics.length === 0
              ? <p className="empty">No open epics.</p>
              : epics.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
          </>
        )}

        {!loading && tab === "tasks" && (
          <>
            <div className="section-header">
              <span className="section-title">Tasks</span>
              <a href={NEW_TASK} target="_blank" rel="noreferrer" className="btn">+ New task</a>
            </div>
            {tasks.length === 0
              ? <p className="empty">No open tasks.</p>
              : tasks.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
          </>
        )}

        {!loading && tab === "board" && (
          <>
            <div className="section-header">
              <span className="section-title">Common board</span>
              <a href={NEW_BOARD_TASK} target="_blank" rel="noreferrer" className="btn">+ Post task</a>
            </div>
            <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginBottom: 20 }}>
              Students claim tasks by commenting <code style={{ color: "var(--text-secondary)" }}>/claim</code> on any issue.
            </p>
            {available.length === 0
              ? <p className="empty">No available tasks on the board.</p>
              : available.map((i) => (
                  <div key={i.id} className="card">
                    <div className="card-row">
                      <span className="card-number">#{i.number}</span>
                      <a href={i.html_url} target="_blank" rel="noreferrer" className="card-title">{i.title}</a>
                    </div>
                    <div className="card-meta">
                      {i.labels.map((l) => <span key={l.name} className={tag(l.name)}>{l.name}</span>)}
                    </div>
                  </div>
                ))}
          </>
        )}

        {!loading && tab === "commits" && (
          <>
            <div className="section-header">
              <span className="section-title">Commits</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {summarised}/{commits.length} summarised — click to expand
              </span>
            </div>
            <CommitFeed commits={commits} comments={comments} />
          </>
        )}
      </main>
    </div>
  );
}
