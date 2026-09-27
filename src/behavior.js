export function matchesProblemQuery(problem, input) {
  const query = input.trim().toLowerCase();
  if (!query) return true;
  const id = query.replace(/^p(?=\d)/, '');
  return String(problem.id).includes(id) || `${problem.title} ${problem.tags.join(' ')}`.toLowerCase().includes(query);
}

export function submissionStatus(status, kind) {
  if (kind === 'sample') return status;
  return kind === 'server' ? '已提交' : '暂存';
}

export function formatSubmissionDate(value) {
  const match = String(value).match(/(\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')} ${match[3].padStart(2, '0')}:${match[4]}` : String(value);
}

export function editIndent(value, start, end, shift) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  if (!shift && start === end) return { value: `${value.slice(0, start)}    ${value.slice(end)}`, start: start + 4, end: start + 4 };
  const effectiveEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const nextNewline = value.indexOf('\n', effectiveEnd);
  const blockEnd = nextNewline < 0 ? value.length : nextNewline;
  const block = value.slice(lineStart, blockEnd);
  const lines = block.split('\n');
  const updated = lines.map(line => shift ? line.replace(/^( {1,4}|\t)/, '') : `    ${line}`);
  const delta = updated.join('\n').length - block.length;
  const firstDelta = updated[0].length - lines[0].length;
  return { value: `${value.slice(0, lineStart)}${updated.join('\n')}${value.slice(blockEnd)}`, start: Math.max(lineStart, start + firstDelta), end: Math.max(lineStart, end + delta) };
}
