import { describe, expect, it } from 'vitest';
import { problems } from '../src/data';
import { renderProblem } from '../src/markdown';

const at = id => problems.find(problem => problem.id === id);

describe('problem rendering', () => {
  it('turns prose identifiers into inline math', async () => {
    const { markdown, html } = await renderProblem(at(1001));

    expect(markdown).toMatch(/\$a\$/);
    expect(markdown).toMatch(/\$b\$/);
    expect(html).toMatch(/class="katex"/);
  });

  it('renders sample fences and copy buttons', async () => {
    const { markdown, html } = await renderProblem(at(1002));

    expect(markdown).toMatch(/```text/);
    expect(html).toMatch(/class="shiki/);
    expect(html).toMatch(/data-copy=/);
    expect(html).toMatch(/class="sample-grid"/);
  });

  it('renders constraints as math', async () => {
    const { markdown } = await renderProblem(at(1002));

    expect(markdown).toMatch(/\\le/);
  });
});
