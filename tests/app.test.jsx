import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App, selectionAsMarkdown } from '../src/App';

describe('Nedmori Lako UI integration', () => {
  beforeEach(() => {
    location.hash = '#/problems';
    localStorage.clear();
  });
  it('renders the core working surface with Lako controls', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '随机一题' })).toHaveProperty(
      'className',
      expect.stringContaining('lako-ui-button'),
    );
    expect(screen.getByRole('tablist', { name: '题库分类' })).toHaveProperty(
      'className',
      expect.stringContaining('lako-ui-tabs'),
    );
    expect(screen.getByRole('button', { name: '按难度筛选' })).toHaveProperty(
      'className',
      expect.stringContaining('lako-ui-dropdown-trigger'),
    );
  });

  it('opens the account menu and navigates to settings', async () => {
    render(<App />);
    const trigger = screen.getByRole('button', { name: '账户菜单' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.mouseEnter(trigger.closest('.oj-account-menu'));
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: '账户' });
    expect(within(menu).getByRole('menuitem', { name: /Sora/ }).getAttribute('href')).toBe('#/profile');
    const settings = within(menu).getByRole('menuitem', { name: '偏好设置' });
    expect(settings.getAttribute('href')).toBe('#/settings');
    fireEvent.click(settings);
    await waitFor(() => expect(screen.getByRole('heading', { name: '偏好设置' })).toBeTruthy());
    expect(screen.queryByRole('dialog', { name: '偏好设置' })).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('filters problems through the Lako input', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索题目' }), {
      target: { value: '区间' },
    });

    expect(screen.getByText('找到 1 道题目')).toBeTruthy();
    expect(screen.getByRole('link', { name: /区间的秘密/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /A \+ B Problem/ })).toBeNull();
  });

  it.each([
    { route: '/problems', group: '题库分类', tab: /我的收藏/, row: '.feed-body .problem-row[href="#/problem/1002"]' },
    { route: '/contests', group: '比赛分类', tab: '即将开始', row: '.feed-body .contest-row' },
    { route: '/submissions', group: '提交记录分类', tab: /我的提交/, row: '.submission-table tbody tr' },
    { route: '/rankings', group: '榜单排序', tab: '通过题数', row: '.ranking-table tbody tr.current-user' },
  ])('replays the list entry for retained rows on $route tab changes', ({ route, group, tab, row }) => {
    if (route === '/submissions') localStorage.setItem('nedmori.submissions', JSON.stringify([{ id: 'Ltest', pid: 1003, status: '后端离线', language: 'Python 3', time: '—', memory: '—', date: '09-27 02:00', kind: 'local', code: 'pass' }]));
    location.hash = `#${route}`;
    render(<App />);
    const before = document.querySelector(row);
    expect(before).toBeTruthy();
    fireEvent.click(within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name: tab }));
    const after = document.querySelector(row);
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
    expect(after.classList.contains('stagger-row')).toBe(true);
  });

  it('opens the algorithm selector with search', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '按算法筛选' }));

    expect(screen.getByRole('listbox', { name: '按算法筛选' })).toBeTruthy();
    expect(screen.getByPlaceholderText('搜索算法…')).toBeTruthy();
  });

  it('keeps the editor draft while switching problem tabs', () => {
    location.hash = '#/problem/1002';
    render(<App />);
    const tabs = within(screen.getByRole('tablist', { name: '题目内容' }));

    expect(tabs.getByRole('tab', { name: '题目描述' }).getAttribute('aria-selected')).toBe('true');
    expect(tabs.getByRole('tab', { name: '提交代码' })).toBeTruthy();
    expect(tabs.getByRole('tab', { name: '提交记录' })).toBeTruthy();

    fireEvent.click(tabs.getByRole('tab', { name: '提交代码' }));
    const editor = screen.getByRole('textbox', { name: '代码' });
    fireEvent.change(editor, { target: { value: 'print("draft survives")' } });
    fireEvent.click(tabs.getByRole('tab', { name: '题目描述' }));
    fireEvent.click(tabs.getByRole('tab', { name: '提交代码' }));

    expect(screen.getByRole('textbox', { name: '代码' }).value).toBe('print("draft survives")');
  });

  it('returns from a contest problem to that contest', () => {
    location.hash = '#/problem/1003?contest=1';
    render(<App />);
    expect(screen.getByRole('link', { name: /返回 Nedmori Weekly Contest #028/ }).getAttribute('href')).toBe('#/contest/1');
  });

  it('sends empty problem history to this problem editor', () => {
    location.hash = '#/problem/1003';
    render(<App />);
    const tabs = within(screen.getByRole('tablist', { name: '题目内容' }));
    fireEvent.click(tabs.getByRole('tab', { name: '提交记录' }));
    fireEvent.click(screen.getByRole('button', { name: '提交解法' }));
    expect(tabs.getByRole('tab', { name: '提交代码' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps a single bookmark beside the title and persists its pressed state', () => {
    location.hash = '#/problem/1003';
    render(<App />);
    const button = screen.getByRole('button', { name: '收藏题目' });
    expect(button.closest('.problem-title-row').querySelector('h1').textContent).toContain('穿过迷雾的最短路');
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '收藏题目' })).toBe(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toBe('取消收藏');
    expect(JSON.parse(localStorage.getItem('nedmori.saved'))).toContain(1003);
    button.focus();
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(button.closest('.bookmark-control').classList.contains('tooltip-dismissed')).toBe(true);
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(JSON.parse(localStorage.getItem('nedmori.saved'))).not.toContain(1003);
  });

  it('leaves the bookmark unchanged and reports a storage failure', () => {
    location.hash = '#/problem/1003';
    const original = Storage.prototype.setItem;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'nedmori.saved') throw new Error('storage blocked');
      return original.call(this, key, value);
    });
    try {
      render(<App />);
      const button = screen.getByRole('button', { name: '收藏题目' });
      fireEvent.click(button);
      expect(button.getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByText('收藏失败，请重试。')).toBeTruthy();
    } finally { storage.mockRestore(); }
  });

  it('indents code on Tab and leaves the editor on Escape', () => {
    location.hash = '#/problem/1003';
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '提交代码' }));
    const editor = screen.getByRole('textbox', { name: '代码' });
    fireEvent.change(editor, { target: { value: 'abc' } });
    editor.focus();
    editor.setSelectionRange(0, 0);
    fireEvent.keyDown(editor, { key: 'Tab' });
    expect(editor.value).toBe('    abc');
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(document.activeElement).not.toBe(editor);
  });

  it('labels leaderboard changes as points and prioritizes the selected metric', () => {
    location.hash = '#/rankings';
    render(<App />);
    expect(screen.getByRole('columnheader', { name: '本周积分变化' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '通过题数' }));
    expect(document.querySelector('.ranking-solved.active-metric')).toBeTruthy();
    expect(document.querySelector('.ranking-rating.active-metric')).toBeNull();
  });

  it('keeps an offline submission in browser storage', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    try {
      location.hash = '#/problem/1003';
      render(<App />);
      fireEvent.click(within(screen.getByRole('tablist', { name: '题目内容' })).getByRole('tab', { name: '提交代码' }));
      fireEvent.change(screen.getByRole('textbox', { name: '代码' }), { target: { value: 'print("isolated offline test")' } });
      fireEvent.click(screen.getByRole('button', { name: '提交代码' }));
      expect(screen.getByText('P1003 · 穿过迷雾的最短路')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '确认提交' }));
      await waitFor(() => expect(JSON.parse(localStorage.getItem('nedmori.submissions'))[0].kind).toBe('local'));
      expect(JSON.parse(localStorage.getItem('nedmori.submissions'))[0].code).toBe('print("isolated offline test")');
    } finally { fetchMock.mockRestore(); }
  });

  it('shows a clear three-option appearance control on the settings page', () => {
    location.hash = '#/settings';
    render(<App />);
    const appearance = within(screen.getByRole('group', { name: '外观' }));

    expect(appearance.getByRole('button', { name: '浅色' })).toBeTruthy();
    expect(appearance.getByRole('button', { name: '深色' })).toBeTruthy();
    expect(appearance.getByRole('button', { name: '跟随系统' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('copies rendered math back as mixed Markdown and LaTeX', () => {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '输入两个整数 <span class="katex"><span class="katex-mathml"><annotation encoding="application/x-tex">a</annotation></span><span class="katex-html">a</span></span> 和 <span class="katex"><span class="katex-mathml"><annotation encoding="application/x-tex">b</annotation></span><span class="katex-html">b</span></span>，计算它们的和。';
    document.body.append(paragraph);
    const range = document.createRange(); range.selectNodeContents(paragraph);
    expect(selectionAsMarkdown(range)).toBe('输入两个整数 $a$ 和 $b$，计算它们的和。');
    paragraph.remove();
  });

  it('stacks notifications and keeps an exit-animation phase', () => {
    vi.useFakeTimers();
    try {
      location.hash = '#/contest/1';
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: '报名参加' }));
      act(() => vi.advanceTimersByTime(500));
      fireEvent.click(screen.getByRole('button', { name: '取消报名' }));
      expect(screen.getAllByRole('status')).toHaveLength(2);
      const slots = document.querySelectorAll('.oj-notification-slot');
      expect(slots[1].style.getPropertyValue('--notification-y')).toBe('55px');
      act(() => vi.advanceTimersByTime(2300));
      expect(document.querySelectorAll('.oj-notification-slot.exiting')).toHaveLength(1);
      expect(document.querySelectorAll('.oj-notification-slot')[1].style.getPropertyValue('--notification-y')).toBe('55px');
      act(() => vi.advanceTimersByTime(260));
      expect(document.querySelectorAll('.oj-notification-slot')).toHaveLength(1);
      expect(document.querySelector('.oj-notification-slot').style.getPropertyValue('--notification-y')).toBe('0px');
      act(() => vi.advanceTimersByTime(500));
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    } finally { vi.useRealTimers(); }
  });
});
