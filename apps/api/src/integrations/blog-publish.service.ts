import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class BlogPublishService {
  private readonly log = new Logger(BlogPublishService.name);

  async publishGit(input: {
    repoUrl?: string;
    branch?: string;
    token?: string;
    contentPath?: string;
    usePullRequest?: boolean;
    dryRun: boolean;
    blog: {
      title: string;
      slug: string;
      excerpt: string;
      bodyMarkdown: string;
      focusKeyword: string;
    };
  }) {
    if (input.dryRun || !input.repoUrl || !input.token) {
      return {
        dryRun: true,
        message: `Would commit blog "${input.blog.slug}" to ${input.repoUrl || '(no repo)'} on ${input.branch || 'main'}`,
      };
    }

    // Minimal GitHub Contents API create/update for markdown posts.
    const match = input.repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/i);
    if (!match) {
      throw new Error('Only GitHub repo URLs supported in v1 git adapter');
    }
    const owner = match[1];
    const repo = match[2];
    const path =
      input.contentPath ||
      `content/posts/${input.blog.slug}.md`;
    const body = `---\ntitle: "${input.blog.title.replace(/"/g, '\\"')}"\nexcerpt: "${input.blog.excerpt.replace(/"/g, '\\"')}"\nfocusKeyword: "${input.blog.focusKeyword}"\n---\n\n${input.blog.bodyMarkdown}\n`;
    const content = Buffer.from(body, 'utf8').toString('base64');

    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${input.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let sha: string | undefined;
    const existing = await fetch(
      `${apiBase}?ref=${encodeURIComponent(input.branch || 'main')}`,
      { headers },
    );
    if (existing.ok) {
      const json = (await existing.json()) as { sha?: string };
      sha = json.sha;
    }

    const put = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `content: add blog ${input.blog.slug}`,
        content,
        branch: input.branch || 'main',
        ...(sha ? { sha } : {}),
      }),
    });
    const putJson = await put.json();
    if (!put.ok) {
      this.log.error(JSON.stringify(putJson));
      throw new Error('GitHub content publish failed');
    }
    return {
      dryRun: false,
      message: `Published to GitHub ${owner}/${repo}:${path}`,
      result: putJson,
      pullRequestPreferred: Boolean(input.usePullRequest),
    };
  }

  async publishWebhook(input: {
    url?: string;
    secret?: string;
    dryRun: boolean;
    payload: Record<string, unknown>;
  }) {
    if (input.dryRun || !input.url) {
      return {
        dryRun: true,
        message: `Would POST blog payload to ${input.url || '(no webhook)'}`,
      };
    }
    const body = JSON.stringify(input.payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (input.secret) {
      headers['X-SMM-Signature'] = createHmac('sha256', input.secret)
        .update(body)
        .digest('hex');
    }
    const res = await fetch(input.url, { method: 'POST', headers, body });
    if (!res.ok) {
      throw new Error(`Webhook failed with ${res.status}`);
    }
    return { dryRun: false, message: `Webhook ${res.status}` };
  }
}
