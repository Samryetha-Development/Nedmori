import { describe, expect, it } from 'vitest';
import { editIndent, formatSubmissionDate, matchesProblemQuery, submissionStatus } from '../src/behavior';

const problem = { id: 1001, title: 'A + B Problem', tags: ['基础', '模拟'] };

describe('problem lookup and submission labels', () => {
  it.each(['P1001', 'p1001', '1001', '  P1001  '])('finds the same problem for %s', query => {
    expect(matchesProblemQuery(problem, query)).toBe(true);
  });
  it('keeps title and algorithm matching', () => {
    expect(matchesProblemQuery(problem, 'a + b')).toBe(true);
    expect(matchesProblemQuery(problem, '模拟')).toBe(true);
    expect(matchesProblemQuery(problem, 'P9999')).toBe(false);
  });
  it('labels recent submission states', () => {
    expect(submissionStatus('Pending', 'server')).toBe('已提交');
    expect(submissionStatus('暂存', 'local')).toBe('暂存');
    expect(submissionStatus('Accepted', 'sample')).toBe('Accepted');
    expect(formatSubmissionDate('09/27 01:18')).toBe('09-27 01:18');
  });
});

describe('textarea indentation', () => {
  it('inserts a four-space indentation at the cursor', () => {
    expect(editIndent('ab', 1, 1, false)).toEqual({ value: 'a    b', start: 5, end: 5 });
  });
  it('indents and unindents selected lines', () => {
    const indented = editIndent('a\nb', 0, 3, false);
    expect(indented.value).toBe('    a\n    b');
    expect(editIndent(indented.value, 0, indented.value.length, true).value).toBe('a\nb');
  });
  it('outdents the current line with a caret at its start', () => {
    expect(editIndent('    line\nnext', 0, 0, true)).toEqual({ value: 'line\nnext', start: 0, end: 0 });
  });
  it('indents a selected single line without replacing its text', () => {
    expect(editIndent('hello', 1, 4, false)).toEqual({ value: '    hello', start: 5, end: 8 });
  });
});
