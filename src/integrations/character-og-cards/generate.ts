// Screenshots /og/characters/<slug> into OG images. Skips if the inputs in
// STATE_FILE are unchanged; --force regenerates anyway.
import { dev } from "astro";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { EnvironmentModuleNode, ViteDevServer } from "vite";

const OUTPUT_DIR = "src/images/og-cards/characters";
const STATE_FILE = "src/integrations/character-og-cards/inputs.json";
const OG_PAGE = "src/integrations/character-og-cards/OgCardPage.astro";
// Not visible as imports or requests, so they can't be saved as 
// dependencies.
const UNTRACKABLE_INPUTS = [
  "src/content/characters",
  "astro.config.mjs",
  "src/integrations/character-og-cards/index.ts",
  "src/integrations/character-og-cards/generate.ts",
];

const toRepoPath = (file: string) => relative(process.cwd(), file).split(sep).join("/");

const hashInputs = async (inputs: string[]) => {
  const hash = createHash("sha256");

  for (const input of inputs) {
    if (!existsSync(input)) {
      hash.update(`${input}\0missing\0`);
      continue;
    }

    const files = statSync(input).isDirectory()
      ? (await readdir(input, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name !== ".DS_Store")
        .map((entry) => toRepoPath(join(entry.parentPath, entry.name)))
        .toSorted()
      : [input];

    for (const file of files) {
      hash.update(`${file}\0`);
      hash.update(await readFile(file));
    }
  }

  return hash.digest("hex");
};

const collectModuleFiles = (vite: ViteDevServer) => {
  const pageFile = join(process.cwd(), OG_PAGE);
  const files = new Set<string>();
  const seen = new Set<EnvironmentModuleNode>();

  for (const environment of Object.values(vite.environments)) {
    const pending = [
      ...(environment.moduleGraph.getModulesByFile(pageFile) ?? []),
    ];
    for (
      let module = pending.pop();
      module !== undefined;
      module = pending.pop()
    ) {
      if (seen.has(module)) {
        continue;
      }
      seen.add(module);
      if (module.file) {
        files.add(toRepoPath(module.file));
      }
      pending.push(...module.importedModules);
    }
  }

  return [...files];
};

const generateCards = async () => {
  let vite: ViteDevServer | undefined;
  const server = await dev({
    logLevel: "error",
    server: { port: 4399 },
    devToolbar: { enabled: false },
    integrations: [
      {
        name: "capture-vite-server",
        hooks: {
          "astro:server:setup": ({ server: devServer }) => {
            vite = devServer;
          },
        },
      },
    ],
  });
  const origin = `http://localhost:${server.address.port}`;
  const browser = await chromium.launch();
  const publicFiles = new Set<string>();
  // Writing cards while the server runs makes Vite reload the page.
  const cards = new Map<string, Buffer>();
  let inputs: string[];
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
    });
    // public/ assets aren't imports, so track them by request.
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin) {
        return;
      }
      const file = join("public", decodeURIComponent(url.pathname));
      if (existsSync(file) && statSync(file).isFile()) {
        publicFiles.add(toRepoPath(file));
      }
    });

    await page.goto(`${origin}/characters`, { waitUntil: "load" });
    const ids = await page
      .locator("article[id]")
      .evaluateAll((articles) => articles.map((article) => article.id));

    publicFiles.clear();
    for (const id of ids) {
      await page.goto(`${origin}/og/characters/${id}`, { waitUntil: "load" });
      await page.evaluate(() =>
        Promise.all([
          document.fonts.ready,
          ...[...document.images].map((image) =>
            image.decode().catch(() => { })
          ),
        ])
      );
      cards.set(id, await page.screenshot());
    }

    if (!vite) {
      throw new Error("Astro didn't hand over its Vite server.");
    }
    // Generated files differ on the deploy server and would always look stale.
    const committable = new Set(
      execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard"],
        { encoding: "utf8" }
      )
        .split("\n")
        .filter(Boolean)
    );
    // astro:content pulls in every collection's images.
    inputs = [...collectModuleFiles(vite), ...publicFiles].filter(
      (file) => committable.has(file) && !file.startsWith("src/content/")
    );
  } finally {
    await browser.close();
    await server.stop();
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const [id, card] of cards) {
    await writeFile(`${OUTPUT_DIR}/${id}.png`, card);
    console.info(`Wrote ${OUTPUT_DIR}/${id}.png`);
  }
  return inputs;
};

const withUntrackable = (inputs: string[]) =>
  [...new Set([...inputs, ...UNTRACKABLE_INPUTS])].toSorted();

const saved: { hash: string; inputs: string[] } | null = existsSync(STATE_FILE)
  ? JSON.parse(await readFile(STATE_FILE, "utf8"))
  : null;
const upToDate =
  saved !== null &&
  saved.hash === (await hashInputs(withUntrackable(saved.inputs)));

if (upToDate && !process.argv.includes("--force")) {
  console.info("Character OG cards are up to date, skipping.");
} else if (!existsSync(chromium.executablePath())) {
  console.warn(
    "WARNING: character OG cards are out of date, but no Playwright browser " +
    "is installed here. Run `npm run og:characters` locally and commit " +
    "the results."
  );
} else {
  const inputs = withUntrackable(await generateCards());
  await writeFile(
    STATE_FILE,
    `${JSON.stringify({ hash: await hashInputs(inputs), inputs }, null, 2)}\n`
  );
  console.info(`Tracking ${inputs.length} input files in ${STATE_FILE}.`);
}
