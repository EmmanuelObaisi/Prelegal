import { readFile } from "node:fs/promises";
import path from "node:path";
import NdaBuilder from "@/components/NdaBuilder";

/**
 * The Common Paper templates live at the repository root, one level above this
 * app, so the app must be built from a full checkout of the repository.
 */
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

async function readTemplate(filename: string): Promise<string> {
  const file = path.join(TEMPLATES_DIR, filename);
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read the NDA template at ${file}. Build the frontend from a full checkout of the repository, ` +
        "where templates/ sits next to frontend/.",
      { cause: error },
    );
  }
}

export default async function Home() {
  const [coverPageTemplate, standardTerms] = await Promise.all([
    readTemplate("Mutual-NDA-coverpage.md"),
    readTemplate("Mutual-NDA.md"),
  ]);

  return <NdaBuilder coverPageTemplate={coverPageTemplate} standardTerms={standardTerms} />;
}
