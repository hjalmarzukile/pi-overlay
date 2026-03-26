import { useState, useEffect } from "react";
import { getIssues, addLabel, getCommits, getRepoCommitComments,
         getIssueComments, postIssueComment, getSubIssues } from "./github";
import "./App.css";

const PROJECT_REPO    = "hjalmarzukile/AInterview_litreview";
const TASK_BOARD_REPO = "hjalmarzukile/task-board";
const GH = "https://github.com";
const NEW_EPIC        = `${GH}/${PROJECT_REPO}/issues/new?template=epic.yml`;
const NEW_TASK        = `${GH}/${PROJECT_REPO}/issues/new?template=task.yml`;
const NEW_BOARD_TASK  = `${GH}/${TASK_BOARD_REPO}/issues/new`;

function tagClass(name) {
  const map = {
    epic: "tag-epic", task: "tag-task",
    "pi-approve": "tag-approve", "self-approve": "tag-self",
    "awaiting-pi-approval": "tag-waiting", "pi-approved": "tag-done",
    blocked: "tag-blocked",
  };
  return `tag ${map[name] || "tag-default"}`;
}

function parseSummary(comments, sha) {
  const c = comments.find(c => c.commit_id === sha && c.body.includes("<!-- commit-summary -->"));
  if (!c) return null;
  return { text: c.body.replace("<!-- commit-summary -->","").replace("**Summary:**","").trim(), url: c.html_url, id: c.id };
}

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function ReplyBox({ onPost }) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const handle = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    await onPost(draft.trim());
    setDraft("");
    setPosting(false);
  };
  return (
    <div className="reply-box">
      <textarea className="reply-input" placeholder="Leave a comment… (⌘↵ to post)"
        value={draft} rows={2} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handle(); }} />
      <div className="reply-actions">
        <button className="btn" onClick={handle} disabled={posting || !draft.trim()}>
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

function Thread({ children, onPost }) {
  return (
    <div className="thread">
      <div className="comments">{children}</div>
      <ReplyBox onPost={onPost} />
    </div>
  );
}

function CommentItem({ author, avatarUrl, time, body, url }) {
  return (
    <div className="comment">
      <div className="comment-header">
        <img src={avatarUrl} alt={author} className="card-avatar" />
        <span className="comment-author">@{author}</span>
        <span className="comment-time">{timeAgo(time)}</span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="comment-link">↗</a>}
      </div>
      <div className="comment-body">{body}</div>
    </div>
  );
}

/* ── Issue card ── */
function IssueCard({ issue, repo, onApprove }) {
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState(null);
  const [subIssues, setSubIssues] = useState(null);
  const needsApproval = issue.labels.some(l => l.name === "awaiting-pi-approval");

  const toggle = () => {
    if (!expanded) {
      getIssueComments(repo, issue.number).then(setComments);
      getSubIssues(repo, issue.number).then(setSubIssues);
    }
    setExpanded(e => !e);
  };

  const handlePost = async (body) => {
    await postIssueComment(repo, issue.number, body);
    const updated = await getIssueComments(repo, issue.number);
    setComments(updated);
  };

  return (
    <div className={`card ${needsApproval ? "approval" : ""}`}>
      {/* Clickable header */}
      <div className="card-clickable" onClick={toggle}>
        <div className="card-row">
          <span className="card-number">#{issue.number}</span>
          <span className="card-title">{issue.title}</span>
          <div className="card-right">
            {issue.comments > 0 && <span className="comment-count">{issue.comments}</span>}
            {issue.assignee && <img className="card-avatar" src={issue.assignee.avatar_url}
              alt={issue.assignee.login} title={`@${issue.assignee.login}`} />}
            <span className="expand-chevron">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>
        <div className="card-meta">
          {issue.labels.map(l => <span key={l.name} className={tagClass(l.name)}>{l.name}</span>)}
          {needsApproval && (
            <button className="btn-approve" onClick={e => { e.stopPropagation(); onApprove(issue.number); }}>
              Approve &amp; close
            </button>
          )}
          <a href={issue.html_url} target="_blank" rel="noreferrer"
            className="open-gh" onClick={e => e.stopPropagation()}>Open in GitHub ↗</a>
        </div>
      </div>

      {/* Expanded thread */}
      {expanded && (
        <Thread onPost={handlePost}>
          {/* Issue body */}
          {issue.body && (
            <div className="thread-body">
              {issue.body.slice(0, 500)}{issue.body.length > 500 ? "…" : ""}
            </div>
          )}
          {/* Sub-issues */}
          {subIssues && subIssues.length > 0 && (
            <div className="sub-issues">
              <span className="thread-label">Sub-issues</span>
              {subIssues.map(s => (
                <div key={s.number} className="sub-issue-row">
                  <span className={`sub-dot ${s.state}`}>●</span>
                  <a href={s.html_url} target="_blank" rel="noreferrer" className="sub-title">
                    #{s.number} {s.title}
                  </a>
                  {s.assignee && <img src={s.assignee.avatar_url} alt={s.assignee.login} className="card-avatar" />}
                </div>
              ))}
            </div>
          )}
          {/* Comments */}
          {comments === null && <p className="thread-loading">Loading comments…</p>}
          {comments && comments.length === 0 && <p className="thread-empty">No comments yet. Be the first.</p>}
          {comments && comments.map(c => (
            <CommentItem key={c.id} author={c.user.login} avatarUrl={c.user.avatar_url}
              time={c.created_at} body={c.body} url={c.html_url} />
          ))}
        </Thread>
      )}
    </div>
  );
}

/* ── Commit row ── */
function CommitRow({ commit, allComments }) {
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState(null);
  const summary = parseSummary(allComments, commit.sha);

  const toggle = () => {
    if (!expanded && !comments) {
      // fetch all comments for this commit
      fetch(`https://api.github.com/repos/${PROJECT_REPO}/commits/${commit.sha}/comments?per_page=50`,
        { headers: { Accept: "application/vnd.github+json" } })
        .then(r => r.ok ? r.json() : []).then(setComments);
    }
    setExpanded(e => !e);
  };

  const handlePost = async (body) => {
    const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
    if (!TOKEN || TOKEN === "undefined") return;
    await fetch(`https://api.github.com/repos/${PROJECT_REPO}/commits/${commit.sha}/comments`, {
      method: "POST",
      headers: { Authorization: `token ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const updated = await fetch(
      `https://api.github.com/repos/${PROJECT_REPO}/commits/${commit.sha}/comments`,
      { headers: { Accept: "application/vnd.github+json" } }
    ).then(r => r.json());
    setComments(updated);
  };

  return (
    <div className="commit-block">
      <div className="commit-row" onClick={toggle}>
        <a href={commit.html_url} target="_blank" rel="noreferrer"
          className="commit-sha" onClick={e => e.stopPropagation()}>
          {commit.sha.slice(0, 7)}
        </a>
        <span className="commit-msg">{commit.commit.message.split("\n")[0]}</span>
        <span className="commit-author">{commit.commit.author.name}</span>
        <span className="summary-dot" title={summary ? "Has summary" : "No summary"}>
          {summary ? "●" : "○"}
        </span>
        <span className="expand-chevron">{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && (
        <Thread onPost={handlePost}>
          {summary && (
            <div className="thread-body">
              <span className="thread-label">Summary</span>
              {summary.text}
            </div>
          )}
          {comments === null && <p className="thread-loading">Loading comments…</p>}
          {comments && comments.filter(c => !c.body.includes("<!-- commit-summary -->")).length === 0
            && <p className="thread-empty">No comments yet.</p>}
          {comments && comments
            .filter(c => !c.body.includes("<!-- commit-summary -->"))
            .map(c => (
              <CommentItem key={c.id} author={c.user.login} avatarUrl={c.user.avatar_url}
                time={c.created_at} body={c.body} url={c.html_url} />
            ))}
        </Thread>
      )}
    </div>
  );
}

/* ── App ── */
export default function App() {
  const [tab, setTab]           = useState("overview");
  const [issues, setIssues]     = useState([]);
  const [boardIssues, setBoardIssues] = useState([]);
  const [commits, setCommits]   = useState([]);
  const [commitComments, setCommitComments] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    const [iss, board, cms, coms] = await Promise.all([
      getIssues(PROJECT_REPO), getIssues(TASK_BOARD_REPO),
      getCommits(PROJECT_REPO, 15), getRepoCommitComments(PROJECT_REPO),
    ]);
    setIssues(iss); setBoardIssues(board);
    setCommits(cms); setCommitComments(coms);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (n) => { await addLabel(PROJECT_REPO, n, "pi-approved"); await load(); };

  const epics     = issues.filter(i => i.labels.some(l => l.name === "epic"));
  const tasks     = issues.filter(i => i.labels.some(l => l.name === "task"));
  const pending   = issues.filter(i => i.labels.some(l => l.name === "awaiting-pi-approval"));
  const available = boardIssues.filter(i => i.labels.some(l => l.name === "available"));
  const summarised = commits.filter(c => parseSummary(commitComments, c.sha)).length;

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
        {pending.length > 0 && <span className="badge-approval">{pending.length} pending approval</span>}
        <button className="btn" onClick={load}>Refresh</button>
      </header>

      <nav className="sidebar">
        <span className="nav-section">Navigate</span>
        {nav.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
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

        {!loading && tab === "overview" && (<>
          {pending.length > 0 && <section>
            <div className="section-header"><span className="section-title urgent">Awaiting approval</span></div>
            {pending.map(i => <IssueCard key={i.id} issue={i} repo={PROJECT_REPO} onApprove={handleApprove} />)}
            <div className="divider" />
          </section>}
          <section style={{ marginBottom: 32 }}>
            <div className="section-header">
              <span className="section-title">Open epics</span>
              <a href={NEW_EPIC} target="_blank" rel="noreferrer" className="btn">+ New epic</a>
            </div>
            {epics.length === 0 ? <p className="empty">No open epics.</p>
              : epics.map(i => <IssueCard key={i.id} issue={i} repo={PROJECT_REPO} onApprove={handleApprove} />)}
          </section>
          <section>
            <div className="section-header"><span className="section-title">Recent commits</span></div>
            {commits.slice(0,5).map(c => <CommitRow key={c.sha} commit={c} allComments={commitComments} />)}
          </section>
        </>)}

        {!loading && tab === "epics" && (<>
          <div className="section-header">
            <span className="section-title">Epics</span>
            <a href={NEW_EPIC} target="_blank" rel="noreferrer" className="btn">+ New epic</a>
          </div>
          {epics.length === 0 ? <p className="empty">No open epics.</p>
            : epics.map(i => <IssueCard key={i.id} issue={i} repo={PROJECT_REPO} onApprove={handleApprove} />)}
        </>)}

        {!loading && tab === "tasks" && (<>
          <div className="section-header">
            <span className="section-title">Tasks</span>
            <a href={NEW_TASK} target="_blank" rel="noreferrer" className="btn">+ New task</a>
          </div>
          {tasks.length === 0 ? <p className="empty">No open tasks.</p>
            : tasks.map(i => <IssueCard key={i.id} issue={i} repo={PROJECT_REPO} onApprove={handleApprove} />)}
        </>)}

        {!loading && tab === "board" && (<>
          <div className="section-header">
            <span className="section-title">Common board</span>
            <a href={NEW_BOARD_TASK} target="_blank" rel="noreferrer" className="btn">+ Post task</a>
          </div>
          <p style={{ color:"var(--text-tertiary)", fontSize:12, marginBottom:20 }}>
            Students claim tasks by commenting <code style={{color:"var(--text-secondary)"}}>/ claim</code> on any issue.
          </p>
          {available.length === 0 ? <p className="empty">No available tasks.</p>
            : available.map(i => <IssueCard key={i.id} issue={i} repo={TASK_BOARD_REPO} onApprove={()=>{}} />)}
        </>)}

        {!loading && tab === "commits" && (<>
          <div className="section-header">
            <span className="section-title">Commits</span>
            <span style={{ fontSize:11, color:"var(--text-tertiary)" }}>
              {summarised}/{commits.length} summarised · click to expand
            </span>
          </div>
          <div className="commit-list">
            {commits.map(c => <CommitRow key={c.sha} commit={c} allComments={commitComments} />)}
          </div>
        </>)}
      </main>
    </div>
  );
}
