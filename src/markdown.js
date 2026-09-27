import MarkdownIt from 'markdown-it';
import markdownItShiki from '@shikijs/markdown-it';
import katex from 'katex';

function mathPlugin(md) {
  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false;
    const end = state.src.indexOf('$', state.pos + 1);
    if (end < 0 || end === state.pos + 1) return false;
    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });
  md.block.ruler.after('blockquote', 'math_block', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const first = state.src.slice(start, state.eMarks[startLine]);
    if (!first.startsWith('$$')) return false;
    let nextLine = startLine;
    let content = first.slice(2);
    let closed = content.endsWith('$$');
    if (closed) content = content.slice(0, -2);
    while (!closed && ++nextLine < endLine) {
      const line = state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine]);
      if (line.endsWith('$$')) {
        content += `\n${line.slice(0, -2)}`;
        closed = true;
      } else content += `\n${line}`;
    }
    if (!closed) return false;
    if (!silent) {
      const token = state.push('math_block', 'math', 0);
      token.block = true;
      token.content = content.trim();
      token.map = [startLine, nextLine + 1];
    }
    state.line = nextLine + 1;
    return true;
  });
  const renderMath = displayMode => (tokens, index) => katex.renderToString(tokens[index].content, {
    displayMode,
    throwOnError: false,
    strict: 'warn',
    trust: false,
    output: 'htmlAndMathml',
  });
  md.renderer.rules.math_inline = renderMath(false);
  md.renderer.rules.math_block = renderMath(true);
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
mathPlugin(md);

let highlighting;
function ensureHighlighting() {
  highlighting ??= markdownItShiki({
    themes: { light: 'github-light', dark: 'github-dark' },
    langs: ['text', 'cpp', 'python', 'java', 'javascript', 'typescript'],
  }).then(plugin => {
    md.use(plugin);
    const fence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, index, options, env, self) => {
      const code = encodeURIComponent(tokens[index].content);
      const copyButton = env?.copyButton === false ? '' : `<button type="button" class="markdown-copy" data-copy="${md.utils.escapeHtml(code)}">复制</button>`;
      return `<div class="markdown-code">${copyButton}${fence(tokens, index, options, env, self)}</div>`;
    };
  });
  return highlighting;
}

const subscript = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₙ': 'n', '₋': '-' };
const superscript = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

function texToken(value) {
  const base = value[0];
  let lower = ''; let upper = '';
  for (const character of value.slice(1)) {
    if (character in subscript) lower += subscript[character];
    if (character in superscript) upper += superscript[character];
  }
  return `${base}${lower ? `_{${lower}}` : ''}${upper ? `^{${upper}}` : ''}`;
}

function mathifyProse(value = '') {
  return value.replace(/(?<![A-Za-z0-9$\\])([A-Za-z][₀₁₂₃₄₅₆₇₈₉ᵢⱼₖₙ₋⁰¹²³⁴⁵⁶⁷⁸⁹]*)(?![A-Za-z0-9])/g, token => `$${texToken(token)}$`);
}

function mathifyConstraints(value = '') {
  return value.split(/([；。])/).map(part => {
    if (!/[≤≥=|]/.test(part)) return mathifyProse(part);
    const tex = part
      .replaceAll('−', '-')
      .replaceAll('≤', '\\le ')
      .replaceAll('≥', '\\ge ')
      .replace(/([A-Za-z][₀₁₂₃₄₅₆₇₈₉ᵢⱼₖₙ₋⁰¹²³⁴⁵⁶⁷⁸⁹]*)/g, texToken)
      .replace(/([0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, power) => `${base}^{${[...power].map(character => superscript[character]).join('')}}`);
    return `$${tex.trim()}$`;
  }).join('');
}

function problemCopy(problem) {
  return {
    description: mathifyProse(problem.desc),
    input: mathifyProse(problem.input),
    output: mathifyProse(problem.output),
    explain: mathifyProse(problem.explain),
    constraints: mathifyConstraints(problem.constraints),
  };
}

function problemMarkdown(problem) {
  const copy = problemCopy(problem);
  const beforeSamples = [
    '## 题目描述', copy.description,
    '## 输入格式', copy.input,
    '## 输出格式', copy.output,
  ].join('\n\n');
  const samples = [
    '## 输入输出样例',
    '### 输入 #1', `\`\`\`text\n${problem.sampleIn}\n\`\`\``,
    '### 输出 #1', `\`\`\`text\n${problem.sampleOut}\n\`\`\``,
  ].join('\n\n');
  const afterSamples = [
    copy.explain ? `## 样例说明\n${copy.explain}` : '',
    '## 数据范围', copy.constraints,
  ].filter(Boolean).join('\n\n');
  return { beforeSamples, samples, afterSamples, markdown: [beforeSamples, samples, afterSamples].join('\n\n') };
}

function sampleBlock(label, value) {
  const code = md.utils.escapeHtml(encodeURIComponent(value));
  return `<div class="sample-box"><div class="sample-label"><span>${label} #1</span><button type="button" class="markdown-copy" data-copy="${code}">复制</button></div>${md.render(`\`\`\`text\n${value}\n\`\`\``, { copyButton: false })}</div>`;
}

export async function renderProblem(problem) {
  await ensureHighlighting();
  const source = problemMarkdown(problem);
  const html = [
    md.render(source.beforeSamples),
    '<h2>输入输出样例</h2>',
    `<div class="sample-grid">${sampleBlock('输入', problem.sampleIn)}${sampleBlock('输出', problem.sampleOut)}</div>`,
    md.render(source.afterSamples),
  ].join('');
  return { markdown: source.markdown, html };
}
