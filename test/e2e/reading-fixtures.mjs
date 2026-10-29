// Synthetic reading material and native PNG fixture bytes for interface verification only.
// Nothing in src/ imports this module; these are never a runtime content fallback.
import { deflateSync } from 'node:zlib';

export const readingPostId = '10000000-0000-4000-8000-000000000001';
export const readingMediaId = '50000000-0000-4000-8000-000000000001';
export const missingMediaId = '50000000-0000-4000-8000-000000000002';
export const decorativeMediaId = '50000000-0000-4000-8000-000000000003';
export const readingTitle = 'The art of noticing: a field guide to everyday curiosity';
export const readingSummary =
  'A small pause can change what we see. This synthetic article exercises the typography, images, tables, and keyboard controls of the reading interface.';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type);
  const payload = Buffer.concat([name, data]);
  let crc = 0xffffffff;
  for (const byte of payload) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, data.length + 8);
  return result;
}
function landscape(width, height) {
  const scanlines = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      const horizon = 0.56 + Math.sin((x / width) * 8) * 0.08;
      const sun = Math.hypot(x / width - 0.75, y / height - 0.27) < 0.11;
      const color = sun ? [228, 193, 132] : y / height < horizon ? [221, 232, 218] : [77, 113, 91];
      const offset = row + 1 + x * 3;
      scanlines[offset] = color[0];
      scanlines[offset + 1] = color[1];
      scanlines[offset + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const readingImages = new Map(
  [
    ['w480', 480, 320],
    ['w960', 960, 640],
    ['w1600', 1200, 800],
  ].map(([name, width, height]) => [name, { width, height, bytes: landscape(width, height) }]),
);

function descriptor(mediaId) {
  return {
    mediaId,
    width: 1200,
    height: 800,
    mimeType: 'image/png',
    variants: [...readingImages].map(([name, image]) => ({
      name,
      apiPath: `/v1/public/posts/${readingPostId}/media/${mediaId}/${name}`,
      width: image.width,
      height: image.height,
      mimeType: 'image/png',
      byteSize: image.bytes.length,
    })),
  };
}

export const wideCode =
  'const observation = { place: "The exceptionally long and deliberately unwrapped name of a quiet corner beside the river", notes: ["shape", "texture", "light", "movement"] };';
export const readingMarkdown = `# A slower look

Curiosity does not need a grand expedition. Sometimes it starts with an ordinary walk, a familiar street, and a little time to notice what has changed. This synthetic story is written for reading-interface verification, with enough content to inspect measure, rhythm, and responsive reflow.

## Notice the details

A reader should be able to settle into a line of text without losing their place. **A clear emphasis**, a gentle *change of voice*, and an inline \`observation.note\` all have useful roles. Unicode belongs here too: café, naïve, 日本語, and a small 🌱.

> Attention is a practice. Make a little room for something you have not noticed before.

### Keep the hierarchy

1. Begin with what is nearby.
   - Observe a shape, a sound, or a color.
   - Ask one question about it.
     - Make the question specific.
2. Write down the detail you want to remember.

## A landscape to pause with

![A synthetic green landscape with a warm sun](media://${readingMediaId})

The illustration above is a local, deterministic test asset. It lets us verify image dimensions, alternative text, loading failures, and a layout that remains stable while reading. This paragraph should remain comfortable on a wide display and reflow into a single column at phone width.

![](media://${decorativeMediaId} "decorative")

## Working with a long example

The following code intentionally contains a very long line. It should scroll inside its own labelled container while the page itself remains within the viewport.

\`\`\`typescript
${wideCode}
console.log(observation.notes.join(", "));
\`\`\`

The copy control must remain reachable by keyboard. If clipboard access is unavailable, a useful explanation should stay available to both sighted readers and assistive technology.

## Comparing what we noticed

| Observation | First impression | A second look | Time of day | Useful question | What to keep |
| --- | --- | --- | --- | --- | --- |
| River light | A bright reflection | Moving bands of warm and cool color | Early morning | How does the light change? | A short written note |
| Garden wall | A rough surface | A pattern of moss and weathered stone | Late afternoon | Which textures repeat? | A careful sketch |
| Familiar path | The usual route | A new perspective after the rain | After a shower | What is different today? | One specific detail |

## When an image is unavailable

![An unavailable field-notes diagram](media://${missingMediaId})

Missing media should explain what is unavailable without hiding the rest of a story. The reader can continue through this article using headings, links, and ordinary keyboard navigation.

## Leave a little room

Return to the [latest stories](/), explore the [engineering collection](/categories/engineering), or follow this story's [learning thread](/tags/learning). Descriptive links give readers enough context before they decide where to go.

An especially long text token should also reflow: curiosity_is_a_practice_of_observing_the_ordinary_and_recording_small_details_without_requiring_the_page_to_scroll_sideways_at_phone_width.

---

This is the end of the synthetic reading fixture. It is not published content and is only served by the isolated browser-test process.
`;

export function applyReadingSummary(post) {
  return {
    ...post,
    title: readingTitle,
    summary: readingSummary,
    cover: {
      ...descriptor(readingMediaId),
      altText: 'A synthetic landscape of green hills and a warm sun',
      decorative: false,
    },
  };
}

export function applyReadingArticle(post) {
  return {
    ...applyReadingSummary(post),
    markdown: readingMarkdown,
    media: [readingMediaId, missingMediaId, decorativeMediaId].map(descriptor),
  };
}
