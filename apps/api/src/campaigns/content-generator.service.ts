import { Injectable } from '@nestjs/common';
import { ClientDocument } from '../clients/client.schema';

@Injectable()
export class ContentGeneratorService {
  slugify(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);
  }

  generate(input: {
    topic: string;
    keywords: string[];
    client: ClientDocument;
  }) {
    const focus =
      input.keywords[0] ||
      'amazon product ranking but no sales';
    const title = this.buildTitle(input.topic, focus);
    const slug = this.slugify(title);
    const excerpt = `${input.client.name} guide: ${input.topic}. Rank without sales is usually conversion — not more keywords.`;

    const bodyMarkdown = this.blogMarkdown({
      title,
      topic: input.topic,
      focus,
      keywords: input.keywords,
      voice: input.client.brandVoice,
      brand: input.client.name,
    });

    const hashtags = [
      'AmazonFBA',
      'AmazonSeller',
      'AmazonPPC',
      'ListingOptimization',
      'EcommerceTips',
      'EcomRisers',
    ];

    const facebook = `Your ASIN can sit on page 1 and still print zero sales.

That is not a ranking problem.
That is a conversion problem.

Before you burn more ad budget, check:
1. Unit session percentage
2. Buy Box / Featured Offer
3. Main image at thumbnail size
4. Search Query Performance (click vs conversion)

Full diagnostic from ${input.client.name}:
${input.client.websiteUrl || 'https://www.ecomrisers.com'}/blog/${slug}/

Comment AUDIT if you want the 7-day fix sequence.`;

    const instagram = `Page 1 rank ≠ sales.

High sessions.
Low conversion.
Fix the listing before you scale ads.

${focus}

${hashtags.map((h) => `#${h}`).join(' ')}`;

    const script = `Hook: Page one rank does not equal sales.
Beat: If sessions are high and orders are flat, stop rewriting keywords.
Beat: Open Business Reports. Check unit session percentage and Buy Box.
Beat: Strong clicks, weak sales? Fix the detail page and offer.
CTA: Full 7-day fix on the ${input.client.name} blog.`;

    const heygenPrompt = `Create a 30-second vertical Reels/TikTok style video.
Brand: ${input.client.name}.
Topic: ${input.topic}.
Primary keyword: ${focus}.
Tone: ${input.client.brandVoice}
Structure: hook (0-5s), 3 punchy insights, CTA.
No hype. Operator voice. On-screen text: RANK ≠ SALES.`;

    return {
      blog: {
        title,
        slug,
        excerpt,
        focusKeyword: focus,
        bodyMarkdown,
      },
      social: {
        facebook,
        instagram,
        hashtags,
      },
      video: {
        heygenPrompt,
        script,
        status: 'ready',
      },
    };
  }

  private buildTitle(topic: string, focus: string) {
    if (/ranking|sales|convert/i.test(topic)) {
      return 'Amazon Product Ranking But No Sales: Why High Rank Still Fails to Convert';
    }
    return `${topic}: ${focus}`;
  }

  private blogMarkdown(input: {
    title: string;
    topic: string;
    focus: string;
    keywords: string[];
    voice: string;
    brand: string;
  }) {
    const kwLine = input.keywords.slice(0, 8).join(', ');
    return `# ${input.title}

${input.voice}

If you are staring at **${input.focus}**, competition is high and the catalog still refuses to print money. That pattern almost never means “need more rank.” It means shoppers see you, arrive, and leave.

## Ranking without sales is a conversion problem

Low sessions + healthy conversion = visibility problem.
High sessions + weak unit session percentage = listing or offer problem.

Open Seller Central → Reports → Business Reports → Detail Page Sales and Traffic by Child Item. Read sessions, unit session percentage, Buy Box percentage, and ordered product sales together.

## Confirm the offer before you rewrite the listing

- Featured Offer / Buy Box near 100%
- In-stock with competitive delivery
- No suppressions or broken variations
- Price that makes value obvious

## Use Search Query Performance

Compare impression share, click share, and conversion share on priority terms. Fix the first broken stage only.

## 7-day fix sequence

1. Child ASIN report + Featured Offer + stock
2. Top lost-revenue queries
3. Main image CTR pass
4. Image stack + bullets for the top objection
5. Price / value framing
6. Exact-match defense; cut waste
7. Recheck USP, Buy Box %, TACoS

## Keywords researched for this piece

${kwLine}

---

Published for ${input.brand}. Topic: ${input.topic}.
`;
  }
}
