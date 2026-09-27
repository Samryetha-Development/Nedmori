import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  LakoButton, LakoInputBox, LakoTextarea, LakoDropdown, LakoTabs,
  LakoDialog, LakoNotification, LakoBadge, LakoEmptyState,
  type LakoButtonProps, type LakoNotificationItem,
} from '@lako/ui/components';
import { icons, problems, contests, users, seedSubmissions, templates } from './data';
import { editIndent, formatSubmissionDate, matchesProblemQuery, submissionStatus } from './behavior';
import { renderProblem } from './markdown';

type Problem = typeof problems[number];
type Language = keyof typeof templates;
type Theme = 'light' | 'dark' | 'system';
type Submission = { id: string; pid: number; status: string; language: string; time: string; memory: string; date: string; kind: string; code?: string };
type Modal = { title: string; description?: string; children?: ReactNode; actions?: ReactNode; dismissible?: boolean };
type Notification = { id: number; message: string; tone: LakoNotificationItem['tone']; exiting: boolean };
type Filter = { tab: string; query: string; level: string; tag: string; page: number };
type AppState = {
  saved: number[]; toggleSaved: (id: number) => void;
  submissions: Submission[]; submit: (p: Problem, language: Language, code: string) => Promise<boolean>;
  registrations: number[]; register: (id: number) => void;
  theme: Theme; setTheme: (theme: Theme) => void; dark: boolean;
  notify: (message: string, tone?: LakoNotificationItem['tone']) => void;
  open: (modal: Modal) => void; close: () => void;
  persist: (key: string, value: unknown) => boolean;
};
const OJ = createContext<AppState | null>(null);
function useOJ() { const value = useContext(OJ); if (!value) throw new Error('Missing OJ provider'); return value; }
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(`nedmori.${key}`) || 'null') ?? fallback; } catch { return fallback; } }
function readArray<T>(key: string, fallback: T[]): T[] { const value = read(key, fallback); return Array.isArray(value) ? value : fallback; }
function themePreference(): Theme { try { const t = localStorage.getItem('nedmori.theme'); return t === 'dark' || t === 'light' ? t : 'system'; } catch { return 'system'; } }
function go(path: string) { location.hash = path; }
function xfade(update: () => void): Promise<void> | undefined {
  const transitionDocument = document as Document & { startViewTransition?: (callback: () => void) => { finished: Promise<void> } };
  if (!transitionDocument.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { update(); return undefined; }
  return transitionDocument.startViewTransition(update).finished;
}
export function selectionAsMarkdown(range: Range) {
  const fragment = range.cloneContents();
  fragment.querySelectorAll<HTMLElement>('.katex').forEach(formula => {
    const source = formula.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
    const display = formula.closest('.katex-display') !== null;
    formula.replaceWith(document.createTextNode(display ? `\n$$${source}$$\n` : `$${source}$`));
  });
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;white-space:pre-wrap';
  holder.append(fragment); document.body.append(holder);
  const markdown = (holder.innerText || holder.textContent || '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  holder.remove();
  return markdown;
}
const navItems = [{ id: 'problems', label: '题库' }, { id: 'contests', label: '比赛' }, { id: 'submissions', label: '提交记录' }, { id: 'rankings', label: '排行榜' }];
const listPages = new Set(navItems.map(item => item.id));
function listRowStyle(index: number): CSSProperties { return { '--row-delay': `${Math.min(index, 6) * 30}ms` } as CSSProperties; }
const initialFilter: Filter = { tab: 'all', query: '', level: 'all', tag: 'all', page: 1 };
const difficultyClass: Record<string, string> = { 入门: 'easy', 普及: 'medium', 提高: 'hard', 省选: 'expert' };

function Icon({ name, className = '' }: { name: keyof typeof icons; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}
function Button({ icon, children, ...props }: LakoButtonProps & { icon?: keyof typeof icons }) {
  return <LakoButton {...props} leadingIcon={icon ? <Icon name={icon} /> : props.leadingIcon}>{children}</LakoButton>;
}
function BookmarkToggle({ id, saved, onToggle }: { id: number; saved: boolean; onToggle: () => void }) {
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [keyPressed, setKeyPressed] = useState(false);
  const tooltipId = `bookmark-tooltip-${id}`;
  return <span className={`bookmark-control${tooltipDismissed ? ' tooltip-dismissed' : ''}`} onPointerLeave={() => setTooltipDismissed(false)}>
    <button type="button" className={`bookmark-button${keyPressed ? ' key-pressed' : ''}`} aria-label="收藏题目" aria-pressed={saved} aria-describedby={tooltipId} onClick={onToggle}
      onKeyDown={event => {
        if (event.key === 'Escape') { setTooltipDismissed(true); setKeyPressed(false); }
        else if (event.key === ' ' || event.key === 'Enter') setKeyPressed(true);
      }}
      onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') setKeyPressed(false); }}
      onBlur={() => { setTooltipDismissed(false); setKeyPressed(false); }}>
      <Icon name="bookmark" className="bookmark-glyph" />
    </button>
    <span id={tooltipId} className="bookmark-tooltip" role="tooltip">{saved ? '取消收藏' : '收藏题目'}</span>
  </span>;
}
function IconButton({ icon, label, ...props }: LakoButtonProps & { icon: keyof typeof icons; label: string }) {
  return <Button variant="ghost" size="sm" {...props} className={`oj-icon-button ${props.className || ''}`} icon={icon} aria-label={label} title={label} />;
}
function Difficulty({ level }: { level: string }) { return <span className={`difficulty ${difficultyClass[level]}`}>{level}</span>; }
function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Dropdown({ label, items, value, onChange, search = false, className = '' }: { label: string; items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; search?: boolean; className?: string }) {
  return <LakoDropdown className={className} ariaLabel={label} items={items} value={items.find(x => x.id === value) ?? null} onChange={x => onChange(x.id)} getKey={x => x.id} getLabel={x => x.label} useSearch={search} getSearchText={x => x.label} searchPlaceholder="搜索算法…" emptyLabel="没有匹配的算法" />;
}

function NotificationStack({ items }: { items: Notification[] }) {
  const elements = useRef(new Map<number, HTMLDivElement>());
  const [heights, setHeights] = useState<Record<number, number>>({});
  useLayoutEffect(() => {
    const measure = () => {
      const next: Record<number, number> = {};
      elements.current.forEach((element, id) => { next[id] = element.getBoundingClientRect().height || 46; });
      setHeights(current => Object.keys(next).some(key => current[Number(key)] !== next[Number(key)]) ? next : current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    elements.current.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [items.length]);
  let nextY = 0;
  const positions = new Map<number, number>();
  items.forEach(item => {
    const position = nextY;
    positions.set(item.id, position);
    nextY += (heights[item.id] || 46) + 9;
  });
  const height = Math.max(0, nextY - (nextY ? 9 : 0));
  return <div className="lako-ui-notifications oj-notifications" style={{ height }} role="region" aria-label="操作通知" aria-live="polite">{items.map(item => <div className={`oj-notification-slot${item.exiting ? ' exiting' : ''}`} style={{ '--notification-y': `${positions.get(item.id) || 0}px` } as CSSProperties} key={item.id}><div ref={element => { if (element) elements.current.set(item.id, element); else elements.current.delete(item.id); }}><LakoNotification tone={item.tone} message={item.message} /></div></div>)}</div>;
}

export function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/problems');
  const currentRoute = useRef(route);
  const routeTransition = useRef(0);
  const [saved, setSaved] = useState(() => readArray('saved', [1002, 1006, 1008]));
  const [submissions, setSubmissions] = useState(() => readArray<Submission>('submissions', []));
  const [registrations, setRegistrations] = useState(() => readArray<number>('registrations', []));
  const [theme, setTheme] = useState<Theme>(themePreference);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationId = useRef(0);
  const notificationTimers = useRef(new Map<number, ReturnType<typeof setTimeout>[]>());
  const [modal, setModal] = useState<Modal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState(initialFilter);
  const main = useRef<HTMLElement>(null);
  const dark = theme === 'system' ? systemDark : theme === 'dark';
  const close = () => setModalOpen(false);
  const notify: AppState['notify'] = (message, tone = 'info') => {
    const id = ++notificationId.current;
    setNotifications(current => [...current, { id, message, tone, exiting: false }]);
    const exit = setTimeout(() => setNotifications(current => current.map(item => item.id === id ? { ...item, exiting: true } : item)), 2800);
    const remove = setTimeout(() => {
      setNotifications(current => current.filter(item => item.id !== id));
      notificationTimers.current.delete(id);
    }, 3060);
    notificationTimers.current.set(id, [exit, remove]);
  };
  const persist = (key: string, value: unknown) => {
    try { localStorage.setItem(`nedmori.${key}`, JSON.stringify(value)); return true; }
    catch { notify(key === 'saved' ? '收藏失败，请重试。' : '保存失败，请下载代码备份。', 'error'); return false; }
  };
  useEffect(() => {
    const change = () => {
      const next = location.hash.slice(1) || '/problems';
      if (next === currentRoute.current) return;
      const toPage = next.split('/')[1];
      currentRoute.current = next;
      const sequence = ++routeTransition.current;
      if (listPages.has(toPage)) {
        delete document.documentElement.dataset.pageTransition;
        flushSync(() => { setRoute(next); close(); });
        return;
      }
      document.documentElement.dataset.pageTransition = toPage === 'problem' ? 'problem' : 'route';
      const finished = xfade(() => flushSync(() => { setRoute(next); close(); }));
      if (finished) void finished.then(
        () => { if (sequence === routeTransition.current) delete document.documentElement.dataset.pageTransition; },
        () => { if (sequence === routeTransition.current) delete document.documentElement.dataset.pageTransition; },
      );
      else delete document.documentElement.dataset.pageTransition;
    };
    window.addEventListener('hashchange', change);
    return () => { window.removeEventListener('hashchange', change); notificationTimers.current.forEach(timers => timers.forEach(clearTimeout)); notificationTimers.current.clear(); };
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/submissions')
      .then(response => { if (!response.ok) throw new Error('API unavailable'); return response.json() as Promise<Submission[]>; })
      .then(remote => {
        if (!active) return;
        const local = readArray<Submission>('submissions', []);
        setSubmissions([...remote, ...local.filter(item => !remote.some(serverItem => serverItem.id === item.id))]);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111416' : '#f7f8f8');
    try { localStorage.setItem('nedmori.theme', theme); } catch { /* Theme still applies in this session. */ }
  }, [dark, theme]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }, [route]);
  const [section, rawId] = route.split('/').filter(Boolean);
  const id = Number(rawId?.split('?')[0]);
  const contestId = section === 'problem' ? Number(new URLSearchParams(route.split('?')[1] || '').get('contest')) : 0;
  const nav = section === 'problem' ? 'problems' : section === 'contest' ? 'contests' : section;
  const problem = problems.find(p => p.id === id);
  useEffect(() => {
    const title = section === 'problem' && problem ? `P${problem.id} ${problem.title}` : section === 'profile' ? '个人主页' : section === 'settings' ? '偏好设置' : navItems.find(x => x.id === nav)?.label || 'Online Judge';
    document.title = `${title} · Nedmori`;
  }, [section, nav, problem]);
  const api: AppState = {
    saved, submissions, registrations, theme, setTheme, dark, notify, persist,
    open: config => { setModal(config); setModalOpen(true); }, close,
    toggleSaved: id => {
      const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
      if (persist('saved', next)) setSaved(next);
    },
    register: id => {
      const next = registrations.includes(id) ? registrations.filter(x => x !== id) : [...registrations, id];
      if (persist('registrations', next)) { setRegistrations(next); notify(next.includes(id) ? '报名成功' : '已取消报名'); }
    },
    submit: async (p, language, code) => {
      let record: Submission;
      try {
        const response = await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid: p.id, language, code }) });
        if (!response.ok) throw new Error('Submission rejected');
        record = await response.json() as Submission;
      } catch {
        record = { id: `L${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, pid: p.id, code, status: '暂存', language, time: '—', memory: '—', date: formatSubmissionDate(new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })), kind: 'local' };
        notify('提交失败，代码已暂存。', 'error');
      }
      const next = [record, ...submissions];
      if (!persist('submissions', next)) return false;
      setSubmissions(next); close(); go('/submissions');
      if (record.kind === 'server') notify('提交成功');
      return true;
    },
  };
  return <OJ.Provider value={api}>
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); main.current?.focus(); }}>跳转到主要内容</a>
    <Header active={nav} route={route} />
    <main id="main" ref={main} className="shell" tabIndex={-1}>
      <div className={`route-view${listPages.has(section) ? ' list-enter-page' : ''}${section === 'problem' ? ' detail-enter-page' : ''}${typeof document.startViewTransition === 'function' || listPages.has(section) ? '' : ' fallback-enter'}`} key={route}>
      {section === 'problems' ? <Problems filter={filter} setFilter={setFilter} />
        : section === 'problem' && problem ? <ProblemPage key={id} p={problem} contestId={contestId} />
        : section === 'contests' ? <Contests />
        : section === 'contest' && contests.some(c => c.id === id) ? <ContestPage id={id} />
        : section === 'submissions' ? <Submissions />
        : section === 'rankings' ? <Rankings />
        : section === 'profile' ? <Profile />
        : section === 'settings' ? <SettingsPage />
        : <LakoEmptyState className="oj-empty full-page" title="没有找到这个页面" description="题目或链接可能不存在。" icon={<Icon name="search" />} actions={<Button variant="primary" onClick={() => go('/problems')}>返回题库</Button>} />}
      </div>
    </main>
    <LakoDialog open={modalOpen} onOpenChange={setModalOpen} title={modal?.title} description={modal?.description} actions={modal?.actions} dismissible={modal?.dismissible ?? true}>{modal?.children}</LakoDialog>
    {notifications.length > 0 && <NotificationStack items={notifications} />}
  </OJ.Provider>;
}

function AccountMenu({ route }: { route: string }) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const openedByHover = useRef(false);
  const cancelClose = () => { window.clearTimeout(closeTimer.current); closeTimer.current = undefined; };
  const scheduleClose = () => { cancelClose(); closeTimer.current = window.setTimeout(() => setOpen(false), 150); };
  useEffect(() => { openedByHover.current = false; setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) { openedByHover.current = false; setOpen(false); } };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { openedByHover.current = false; setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  return <div className="oj-account-menu" ref={menu} onMouseEnter={() => { cancelClose(); if (!open) { openedByHover.current = true; setOpen(true); } }} onMouseLeave={() => { openedByHover.current = false; scheduleClose(); }}>
    <Button ref={trigger} variant="ghost" className={`account-button oj-account-trigger${route === '/profile' || route === '/settings' ? ' profile-current' : ''}`} aria-label="账户菜单" aria-haspopup="menu" aria-expanded={open} onClick={() => { cancelClose(); if (openedByHover.current) { openedByHover.current = false; return; } setOpen(value => !value); }}>
      <Icon name="user" /><span className="account-name">Sora</span>
    </Button>
    <div className={`oj-account-popover${open ? ' open' : ''}`} role="menu" aria-label="账户" aria-hidden={!open}>
      <a className="oj-account-profile" href="#/profile" role="menuitem" tabIndex={open ? 0 : -1} aria-current={route === '/profile' ? 'page' : undefined} onClick={() => setOpen(false)}><span className="avatar" aria-hidden="true">S</span><span><strong>Sora</strong><small>个人主页</small></span></a>
      <div className="oj-account-divider" role="separator" />
      <a className="oj-account-item" href="#/settings" role="menuitem" tabIndex={open ? 0 : -1} aria-current={route === '/settings' ? 'page' : undefined} onClick={() => setOpen(false)}><Icon name="settings" /><span>偏好设置</span></a>
    </div>
  </div>;
}
function Header({ active, route }: { active: string; route: string }) {
  const oj = useOJ();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMenu(false); }, [route]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && menu) { setMenu(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape);
  }, [menu]);
  return <header className="header"><div className="shell header-inner">
    <a className="brand" href="#/problems" aria-label="Nedmori 首页"><span className="brand-icon" aria-hidden="true">n<span>:</span></span><span>Nedmori<span className="brand-caption">Online Judge</span></span></a>
    <nav className="oj-desktop-navigation" aria-label="主导航"><LakoTabs items={navItems} value={active} onChange={value => go(`/${value}`)} ariaLabel="主导航" className="oj-nav-tabs" /></nav>
    <div className="header-actions">
      <IconButton icon={oj.dark ? 'sun' : 'moon'} label={oj.dark ? '切换至浅色主题' : '切换至深色主题'} onClick={() => oj.setTheme(oj.dark ? 'light' : 'dark')} />
      <span className="header-divider" />
      <AccountMenu route={route} />
      <IconButton ref={menuButton} icon={menu ? 'close' : 'menu'} label={menu ? '关闭导航' : '打开导航'} className="oj-menu-toggle" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)} />
    </div>
    {menu && <nav id="mobile-navigation" className="oj-mobile-navigation" aria-label="移动导航">{navItems.map(item => <Button key={item.id} variant="ghost" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => { go(`/${item.id}`); setMenu(false); }}>{item.label}</Button>)}</nav>}
  </div></header>;
}
function SettingsPage() {
  const { theme, setTheme } = useOJ();
  const options: { value: Theme; label: string }[] = [{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '跟随系统' }];
  return <section className="full-page settings-page"><div className="breadcrumb"><a href="#/profile"><Icon name="left" />个人主页</a></div><h1>偏好设置</h1><section className="settings-section"><h2>外观</h2><div className="theme-options" role="group" aria-label="外观">{options.map(option => <Button key={option.value} size="sm" variant={theme === option.value ? 'primary' : 'secondary'} aria-pressed={theme === option.value} onClick={() => setTheme(option.value)}>{option.label}</Button>)}</div></section></section>;
}
function Sidebar() {
  return <aside className="sidebar" aria-label="题库动态">
    <a className="daily-entry" href="#/problem/1002"><span className="daily-entry-icon"><Icon name="spark" /></span><span><small>推荐练习</small><strong>最长上升子序列</strong></span><Icon name="arrow" /></a>
    <section className="sidebar-section"><div className="section-heading"><h2>即将开始</h2><a className="text-button" href="#/contests">全部比赛 <Icon name="arrow" /></a></div><a className="contest-mini" href="#/contest/1"><LakoBadge tone="info">周赛</LakoBadge><h3>Nedmori Weekly Contest #028</h3><p><Icon name="calendar" /> 09.27 周日 · 14:00 — 16:00</p></a><div className="problem-meta"><span>5 道题目</span><span className="dot" /><span>OI 赛制</span><span className="dot" /><span>2 小时</span></div></section>
  </aside>;
}

function ActivityOverview() {
  return <><div className="stats"><div className="stat"><strong>128</strong><span>已通过题目</span></div><div className="stat"><strong>7<small>天</small></strong><span>连续练习</span></div><div className="stat"><strong>2,240</strong><span>当前积分</span></div></div>
    <div className="heatmap-months" aria-hidden="true"><span>5 月</span><span>6 月</span><span>7 月</span><span>8 月</span><span>9 月</span></div>
    <div className="heatmap profile-heatmap" role="img" aria-label="2026 年 5 月至 9 月的练习活跃度">{Array.from({ length: 140 }, (_, i) => <span key={i} className="heat-cell" data-level={(i * 13 + i % 7 * 3) % 11 < 4 ? 0 : (i * 7 % 4) + 1} />)}</div>
    <div className="heatmap-legend"><span>2026 年 5 月至 9 月</span><span>少 <i className="legend-square" /><i className="legend-square dark" /> 多</span></div></>;
}

function Profile() {
  return <section className="full-page profile-page"><div className="profile-page-heading"><span className="avatar">S</span><div><h1>Sora</h1></div><Button size="sm" onClick={() => go('/settings')}>偏好设置</Button></div>
    <section className="profile-section"><h2>练习概览</h2><ActivityOverview /></section>
    <section className="profile-section"><h2>最近活动</h2><div className="profile-activity"><span className="problem-status done"><Icon name="check" /></span><div><strong>通过了「区间的秘密」</strong><small>09-26 10:42 · C++ 17</small></div><a className="text-button" href="#/problem/1004">查看题目 <Icon name="arrow" /></a></div></section>
  </section>;
}
function ProblemRow({ p, index, contestId, transitionIndex }: { p: Problem; index?: number; contestId?: number; transitionIndex?: number }) {
  const { saved } = useOJ();
  return <a href={`#/problem/${p.id}${contestId ? `?contest=${contestId}` : ''}`} className={`problem-row${transitionIndex === undefined ? '' : ' stagger-row'}`} style={transitionIndex === undefined ? undefined : listRowStyle(transitionIndex)}>
    <span className={`problem-status ${p.status}`} aria-label={index === undefined ? p.status === 'done' ? '已通过' : p.status === 'attempted' ? '尝试过' : '未尝试' : undefined}>{index === undefined ? <Icon name={p.status === 'done' ? 'check' : p.status === 'attempted' ? 'clock' : 'circle'} /> : String.fromCharCode(65 + index)}</span>
    <div><h2 className="problem-title">{p.title}{saved.includes(p.id) && <Icon name="star" className="tiny-star" />}</h2><div className="problem-meta"><span className="problem-id mono">P{p.id}</span><span className="dot" />{p.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div></div>
    <Difficulty level={p.level} /><span className="acceptance">{p.rate}<span className="percent">%</span><small>{p.sub} 次提交</small></span>
  </a>;
}
function Problems({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  const { saved } = useOJ();
  const update = (patch: Partial<Filter>) => setFilter({ ...filter, page: 1, ...patch });
  const query = filter.query.trim();
  const list = problems.filter(p => (filter.tab !== 'saved' || saved.includes(p.id)) && (filter.tab !== 'todo' || p.status !== 'done') && (filter.level === 'all' || p.level === filter.level) && (filter.tag === 'all' || p.tags.includes(filter.tag)) && matchesProblemQuery(p, query));
  const pages = Math.max(1, Math.ceil(list.length / 8)); const page = Math.min(filter.page, pages);
  const visible = list.slice((page - 1) * 8, page * 8);
  const items = [['all', '全部题目', problems.length], ['saved', '我的收藏', saved.length], ['todo', '未完成', problems.filter(p => p.status !== 'done').length]].map(([id, label, count]) => ({ id: String(id), label: <>{label}<span className="tab-count">{count}</span></> }));
  const hasFilters = query || filter.level !== 'all' || filter.tag !== 'all';
  const changePage = (next: number) => { update({ page: next }); document.querySelector('.table-heading')?.scrollIntoView({ block: 'start' }); };
  return <div className="page-grid"><section className="feed">
    <PageHeading title="题库" description="16 道题目 · 按难度与算法查找" action={<Button variant="primary" icon="shuffle" onClick={() => { const pool = list.length ? list : problems; go(`/problem/${pool[Math.floor(Math.random() * pool.length)].id}`); }}>随机一题</Button>} />
    <LakoTabs items={items} value={filter.tab} onChange={tab => update({ tab })} ariaLabel="题库分类" />
    <div className="filter-bar"><LakoInputBox containerClassName="oj-search" type="search" prefix={<Icon name="search" />} aria-label="搜索题目" placeholder="搜索题号、标题或算法…" value={filter.query} onChange={e => update({ query: e.target.value })} />
      <Dropdown className="oj-filter" label="按难度筛选" value={filter.level} onChange={level => update({ level })} items={[{ id: 'all', label: '全部难度' }, ...['入门', '普及', '提高', '省选'].map(x => ({ id: x, label: x }))]} />
      <Dropdown className="oj-filter oj-filter-tags" label="按算法筛选" search value={filter.tag} onChange={tag => update({ tag })} items={[{ id: 'all', label: '算法标签' }, ...[...new Set(problems.flatMap(p => p.tags))].map(x => ({ id: x, label: x }))]} />
    </div>
    {hasFilters && <div className="filter-summary"><span>找到 {list.length} 道题目</span><Button size="sm" variant="ghost" onClick={() => update({ query: '', level: 'all', tag: 'all' })}>清除筛选</Button></div>}
    <div className="table-heading" aria-hidden="true"><span /><span>题目</span><span>难度</span><span>通过率</span></div>
    <div className="feed-body" key={filter.tab} aria-live="polite">{visible.length ? visible.map((p, index) => <ProblemRow key={p.id} p={p} transitionIndex={index} />) : <LakoEmptyState className="oj-empty" title={filter.tab === 'saved' ? '还没有匹配的收藏' : '没有找到匹配的题目'} description="换个关键词，或试试其他筛选条件。" icon={<Icon name="search" />} actions={<Button onClick={() => setFilter(initialFilter)}>重置筛选</Button>} />}</div>
    <div className="pagination"><span>{list.length ? `显示 ${(page - 1) * 8 + 1}–${Math.min(page * 8, list.length)} 条，共 ${list.length} 道题目` : '0 道题目'}</span><div className="page-buttons">
      <IconButton icon="left" label="上一页" disabled={page === 1} onClick={() => changePage(page - 1)} />
      {Array.from({ length: pages }, (_, i) => <Button className="oj-page-button" size="sm" variant={page === i + 1 ? 'primary' : 'ghost'} key={i} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => changePage(i + 1)}>{i + 1}</Button>)}
      <IconButton icon="chevron" label="下一页" disabled={page === pages} onClick={() => changePage(page + 1)} />
    </div></div>
  </section><Sidebar /></div>;
}

function ProblemPage({ p, contestId }: { p: Problem; contestId: number }) {
  const oj = useOJ(); const [tab, setTab] = useState('statement');
  const [language, setLanguage] = useState<Language>(() => { const value = read<Language>('language', 'C++ 17'); return value in templates ? value : 'C++ 17'; });
  const fromContest = contests.find(c => c.id === contestId && c.ids.includes(p.id));
  const saved = oj.saved.includes(p.id);
  return <article className="full-page problem-page"><div className="breadcrumb"><a href={fromContest ? `#/contest/${fromContest.id}` : '#/problems'}><Icon name="left" />{fromContest ? `返回 ${fromContest.title}` : '题库'}</a></div>
    <div className="problem-heading"><div className="problem-title-row"><h1><span className="mono">P{p.id}</span>{p.title}</h1><BookmarkToggle id={p.id} saved={saved} onToggle={() => oj.toggleSaved(p.id)} /></div><div className="detail-meta"><Difficulty level={p.level} /><span><Icon name="clock" />1,000 ms</span><span><Icon name="memory" />256 MB</span><span className="detail-tags">{p.tags.map(tag => <LakoBadge key={tag}>{tag}</LakoBadge>)}</span></div></div>
    <LakoTabs items={[{ id: 'statement', label: '题目描述' }, { id: 'submit', label: '提交代码' }, { id: 'history', label: '提交记录' }]} value={tab} onChange={setTab} ariaLabel="题目内容" />
    <div className="problem-tab-content animated-tabs">
      <div className="problem-tab-panel statement-panel" hidden={tab !== 'statement'}><Statement p={p} /></div>
      <div className="problem-tab-panel submit-panel" hidden={tab !== 'submit'}><CodeEditor key={`${p.id}.${language}`} p={p} language={language} onLanguage={value => { oj.persist('language', value); setLanguage(value); }} /></div>
      <div className="problem-tab-panel history-panel" hidden={tab !== 'history'}><SubmissionTable list={[...oj.submissions, ...seedSubmissions].filter(s => s.pid === p.id)} onEmptySubmit={() => setTab('submit')} /></div>
    </div>
  </article>;
}
function Statement({ p }: { p: Problem }) {
  const [rendered, setRendered] = useState<string | null>(null);
  const [copiedSample, setCopiedSample] = useState('');
  useEffect(() => {
    let active = true;
    setRendered(null);
    renderProblem(p)
      .then(result => { if (active) setRendered(result.html); })
      .catch(() => { if (active) setRendered(null); });
    return () => { active = false; };
  }, [p.id]);
  const copy = async (text: string, sample = '', button?: HTMLButtonElement) => {
    const original = button?.textContent || '复制';
    const changeButton = (label: string, copied: boolean) => {
      if (!button?.isConnected) return;
      button.textContent = label;
      button.classList.toggle('copied', copied);
    };
    try {
      await navigator.clipboard.writeText(text);
      changeButton('已复制', true);
      if (sample) setCopiedSample(sample);
    } catch {
      changeButton('复制失败', false);
      if (sample) setCopiedSample(`error:${sample}`);
    }
    window.setTimeout(() => {
      changeButton(original, false);
      if (sample) setCopiedSample(current => current === sample || current === `error:${sample}` ? '' : current);
    }, 1400);
  };
  const copyRenderedText = (event: ReactClipboardEvent<HTMLElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !event.clipboardData) return;
    const range = selection.getRangeAt(0).cloneRange();
    const closestKatex = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest('.katex');
    const startMath = closestKatex(range.startContainer); const endMath = closestKatex(range.endContainer);
    if (startMath) range.setStartBefore(startMath);
    if (endMath) range.setEndAfter(endMath);
    const markdown = selectionAsMarkdown(range);
    event.clipboardData.setData('text/plain', markdown);
    event.preventDefault(); event.stopPropagation();
  };
  if (rendered) return <section className="statement markdown-body" onCopy={copyRenderedText} onClick={event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
    if (button?.dataset.copy) void copy(decodeURIComponent(button.dataset.copy), '', button);
  }}><div dangerouslySetInnerHTML={{ __html: rendered }} /></section>;
  return <section className="statement"><h2>题目描述</h2><p>{p.desc}</p><h2>输入格式</h2><p>{p.input}</p><h2>输出格式</h2><p>{p.output}</p><h2>输入输出样例</h2>
    <div className="sample-grid">{[['输入', p.sampleIn], ['输出', p.sampleOut]].map(([name, text]) => <div key={name} className="sample-box"><div className="sample-label">{name} #1<Button size="sm" variant="ghost" aria-label={`复制样例${name}`} onClick={() => void copy(text, name)}>{copiedSample === name ? '已复制' : copiedSample === `error:${name}` ? '复制失败' : '复制'}</Button></div><pre>{text}</pre></div>)}</div>
    {p.explain && <><h2>样例说明</h2><p>{p.explain}</p></>}<h2>数据范围</h2><p className="constraint">{p.constraints}</p>
  </section>;
}
function CodeEditor({ p, language, onLanguage }: { p: Problem; language: Language; onLanguage: (language: Language) => void }) {
  const oj = useOJ(); const key = `draft.${p.id}.${language}`;
  const [code, setCode] = useState(() => { const draft = read(key, templates[language]); return typeof draft === 'string' ? draft : templates[language]; });
  const [draftStatus, setDraftStatus] = useState('');
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const editor = useRef<HTMLTextAreaElement>(null); const numbers = useRef<HTMLDivElement>(null);
  const filename = language === 'C++ 17' ? 'main.cpp' : language === 'Python 3' ? 'main.py' : 'Main.java';
  const change = (value: string) => { setCode(value); setDraftStatus(oj.persist(key, value) ? '' : '保存失败 · 请下载代码'); };
  const position = () => { const el = editor.current; if (!el) return; const before = el.value.slice(0, el.selectionStart).split('\n'); setCursor({ line: before.length, column: (before.at(-1)?.length || 0) + 1 }); };
  const download = () => { const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const reset = () => oj.open({ title: '重置代码？', description: '当前题目、当前语言的代码将恢复初始模板。', dismissible: false, actions: <><Button onClick={oj.close}>取消</Button><Button variant="primary" onClick={() => { change(templates[language]); oj.close(); }}>重置</Button></> });
  const submit = () => {
    if (!code.trim()) { oj.notify('请先写下代码，再提交。', 'error'); editor.current?.focus(); return; }
    oj.open({ title: '提交这份代码', description: `P${p.id} · ${p.title}`, actions: <><Button onClick={oj.close}>继续编辑</Button><Button variant="primary" onClick={() => void oj.submit(p, language, code)}>确认提交</Button></> });
  };
  const onEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' || (event.key === 'Tab' && event.ctrlKey)) { event.preventDefault(); editor.current?.blur(); return; }
    if (event.key !== 'Tab' || event.altKey || event.metaKey) return;
    event.preventDefault();
    const field = event.currentTarget;
    const result = editIndent(code, field.selectionStart, field.selectionEnd, event.shiftKey);
    change(result.value);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(result.start, result.end); position(); });
  };
  return <section className="editor-panel" aria-label="代码编辑器"><div className="editor-toolbar"><Dropdown className="oj-language" label="编程语言" items={Object.keys(templates).map(x => ({ id: x, label: x }))} value={language} onChange={value => onLanguage(value as Language)} /><span className="editor-filename">{filename}</span><IconButton icon="download" label="下载代码" onClick={download} /><IconButton icon="reset" label="重置代码" onClick={reset} /></div>
    <div className="editor"><div ref={numbers} className="line-numbers" aria-hidden="true">{Array.from({ length: Math.max(14, code.split('\n').length) }, (_, i) => i + 1).join('\n')}</div><LakoTextarea containerClassName="oj-code-field" className="oj-code-input" ref={editor} aria-label="代码" aria-describedby="editor-help" value={code} spellCheck={false} autoComplete="off" autoCapitalize="off" wrap="off" onKeyDown={onEditorKeyDown} onChange={e => change(e.target.value)} onSelect={position} onScroll={e => { if (numbers.current) numbers.current.scrollTop = e.currentTarget.scrollTop; }} /></div>
    <div className="editor-footer"><div className="editor-meta"><span>{draftStatus && <>{draftStatus}<i aria-hidden="true" /></>}Ln {cursor.line}, Col {cursor.column}</span><small id="editor-help">Tab 缩进，Shift+Tab 反缩进；Esc 或 Ctrl+Tab 离开编辑框。</small></div><Button size="sm" variant="primary" icon="send" onClick={submit}>提交代码</Button></div>
  </section>;
}

function Contests() {
  const { registrations } = useOJ(); const [tab, setTab] = useState('all');
  return <section className="full-page content-page"><PageHeading title="比赛" description="比赛安排 · 时间为 UTC+8" />
    <LakoTabs items={[{ id: 'all', label: '全部比赛' }, { id: 'upcoming', label: '即将开始' }, { id: 'finished', label: '已结束' }]} value={tab} onChange={setTab} ariaLabel="比赛分类" />
    <div className="feed-body" key={tab}>{contests.filter(c => tab === 'all' || c.kind === tab).map((c, index) => <article key={c.id} className="contest-row stagger-row" style={listRowStyle(index)}><div className="date-block"><span>{c.month}</span><strong>{c.day}</strong></div><div><LakoBadge tone={c.kind === 'upcoming' ? 'info' : 'neutral'}>{c.status}</LakoBadge><h2><a href={`#/contest/${c.id}`}>{c.title}</a></h2><p>{c.date}</p><div className="contest-meta"><span>{c.type}</span><span>{c.count} 道题目</span><span>{c.level}</span></div></div><Button size="sm" onClick={() => go(`/contest/${c.id}`)} trailingIcon={<Icon name="arrow" />}>{c.kind === 'finished' ? '赛后练习' : registrations.includes(c.id) ? '已报名' : '查看比赛'}</Button></article>)}</div>
  </section>;
}
function ContestPage({ id }: { id: number }) {
  const { registrations, register } = useOJ(); const c = contests.find(c => c.id === id)!;
  return <section className="full-page content-page"><div className="breadcrumb"><a href="#/contests">比赛</a><Icon name="chevron" /><span>{c.type}</span></div><LakoBadge tone="info">{c.status}</LakoBadge><h1 className="oj-contest-title">{c.title}</h1><p className="wide-description">{c.intro}</p><dl className="dialog-dl"><dt>比赛时间</dt><dd>{c.date}（UTC+8）</dd><dt>比赛形式</dt><dd>{c.type} · {c.count} 道题目</dd><dt>难度范围</dt><dd>{c.level}</dd></dl>
    {c.kind === 'upcoming' && <Button variant={registrations.includes(id) ? 'secondary' : 'primary'} onClick={() => register(id)}>{registrations.includes(id) ? '取消报名' : '报名参加'}</Button>}
    <h2 className="oj-section-title">{c.kind === 'finished' ? '赛后练习' : '比赛题目'}</h2>{c.ids.map((problemId, index) => <ProblemRow key={problemId} p={problems.find(p => p.id === problemId)!} index={index} contestId={id} />)}
  </section>;
}
function SubmissionTable({ list, onEmptySubmit, sharedRows = false }: { list: Submission[]; onEmptySubmit?: () => void; sharedRows?: boolean }) {
  const oj = useOJ();
  if (!list.length) return <LakoEmptyState className="oj-empty" title="还没有提交记录" description={onEmptySubmit ? '为当前题目写下解法。' : '选择一道题，写下你的第一份解法。'} icon={<Icon name="code" />} actions={<Button onClick={onEmptySubmit || (() => go('/problems'))}>{onEmptySubmit ? '提交解法' : '浏览题库'}</Button>} />;
  return <div className="table-scroll submission-scroll"><table className="data-table submission-table"><thead><tr><th>提交编号 / 时间</th><th>题目</th><th>状态</th><th>语言</th><th className="right">用时 / 内存</th></tr></thead><tbody>{list.map((s, index) => {
    const p = problems.find(p => p.id === s.pid); if (!p) return null;
    const statusClass = ({
      'Accepted': 'accepted',
      'Wrong Answer': 'wrong-answer',
      'Runtime Error': 'runtime-error',
      'Time Limit Exceeded': 'time-limit',
      'Compilation Error': 'compile-error',
      'Pending': 'pending',
    } as Record<string, string>)[s.status] || 'pending';
    return <tr key={s.id} className={sharedRows ? 'stagger-row' : undefined} style={sharedRows ? listRowStyle(index) : undefined}><td className="submission-id"><Button variant="ghost" size="sm" className="oj-submission-link mono" onClick={() => oj.open({ title: `提交 ${s.id}`, children: <><dl className="dialog-dl"><dt>题目</dt><dd>P{s.pid} {p.title}</dd><dt>时间</dt><dd>{formatSubmissionDate(s.date)}</dd><dt>语言</dt><dd>{s.language}</dd><dt>状态</dt><dd>{submissionStatus(s.status, s.kind)}</dd></dl>{s.code && <div className="submission-detail"><pre>{s.code}</pre></div>}</>, actions: <Button variant="primary" onClick={oj.close}>关闭</Button> })}><span className="submission-id-full">{s.id}</span><span className="submission-id-short">详情</span></Button><div className="oj-table-meta">{formatSubmissionDate(s.date)}</div></td><td className="submission-problem"><a className="submission-link" href={`#/problem/${s.pid}`}>{p.title}</a></td><td className="submission-result"><span className={`submission-status ${statusClass}`}>{submissionStatus(s.status, s.kind)}</span><span className="submission-mobile-time">{formatSubmissionDate(s.date)}</span></td><td className="muted submission-language">{s.language}</td><td className="right muted submission-usage">{s.time}<div className="oj-table-meta">{s.memory}</div></td></tr>;
  })}</tbody></table></div>;
}
function Submissions() {
  const { submissions } = useOJ(); const [tab, setTab] = useState('all');
  return <section className="full-page"><PageHeading title="提交记录" description="查看最近的提交" action={<Button variant="primary" onClick={() => go('/problems')} trailingIcon={<Icon name="arrow" />}>继续练习</Button>} />
    <LakoTabs items={[{ id: 'all', label: <>全部记录<span className="tab-count">{submissions.length + seedSubmissions.length}</span></> }, { id: 'mine', label: <>我的提交<span className="tab-count">{submissions.length}</span></> }]} value={tab} onChange={setTab} ariaLabel="提交记录分类" />
    <SubmissionTable key={tab} list={tab === 'mine' ? submissions : [...submissions, ...seedSubmissions]} sharedRows />
  </section>;
}
function Rankings() {
  const [tab, setTab] = useState('rating'); const ranked = [...users].sort((a, b) => Number(b[tab === 'solved' ? 3 : 2]) - Number(a[tab === 'solved' ? 3 : 2]));
  return <section className="full-page content-page rankings-page"><PageHeading title="排行榜" description="按比赛积分或通过题数查看排名" />
    <LakoTabs items={[{ id: 'rating', label: '比赛积分' }, { id: 'solved', label: '通过题数' }]} value={tab} onChange={setTab} ariaLabel="榜单排序" />
    <div className="ranking-intro"><span className="rank-number mono">{String(ranked.findIndex(u => u[0] === 'Sora') + 1).padStart(2, '0')}</span><div><h3>Sora 的{tab === 'rating' ? '积分' : '题数'}排名</h3><p>按{tab === 'rating' ? '比赛积分' : '通过题数'}排序</p></div></div>
    <div className="table-scroll ranking-scroll"><table className="data-table ranking-table"><thead><tr><th>排名</th><th>用户</th><th className="right ranking-solved">通过题数</th><th className="right ranking-rating">积分</th><th className="right ranking-change">本周积分变化</th></tr></thead><tbody key={tab}>{ranked.map((u, i) => <tr key={u[0]} className={`stagger-row${u[0] === 'Sora' ? ' current-user' : ''}`} style={listRowStyle(i)}><td className={`rank-cell mono ${i < 3 ? 'top' : ''}`}>{String(i + 1).padStart(2, '0')}</td><td><div className="user-cell"><span className="avatar">{String(u[0])[0].toUpperCase()}</span><div><strong>{u[0]} {u[0] === 'Sora' && <LakoBadge>你</LakoBadge>}</strong><small>{u[1]}</small></div></div></td><td className={`right ranking-solved${tab === 'solved' ? ' active-metric' : ''}`}>{u[3]}</td><td className={`right ranking-rating${tab === 'rating' ? ' active-metric' : ''}`}>{Number(u[2]).toLocaleString()}</td><td className="right accent ranking-change">{u[4]} 分</td></tr>)}</tbody></table></div>
  </section>;
}
