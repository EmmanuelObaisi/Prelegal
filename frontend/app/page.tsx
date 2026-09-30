import { readFile } from "node:fs/promises";
import path from "node:path";
import App from "@/components/App";
import type { DocumentDef } from "@/lib/documents";

/**
 * documents.json and the Common Paper templates live at the repository root,
 * one level above this app, so the app must be built from a full checkout.
 */
const ROOT_DIR = path.join(process.cwd(), "..");

async function readRootFile(relativePath: string): Promise<string> {
  const file = path.join(ROOT_DIR, relativePath);
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read ${file}. Build the frontend from a full checkout of the repository, ` +
        "where documents.json and templates/ sit next to frontend/.",
      { cause: error },
    );
  }
}

export default async function Home() {
  const definitions: DocumentDef[] = JSON.parse(await readRootFile("documents.json"));
  const [ndaCoverPage, ...standardTerms] = await Promise.all([
    readRootFile("templates/Mutual-NDA-coverpage.md"),
    ...definitions.map((doc) => readRootFile(`templates/${doc.file}`)),
  ]);
  const documents = definitions.map((doc, i) => ({ ...doc, standardTerms: standardTerms[i] }));

  return <App documents={documents} ndaCoverPage={ndaCoverPage} />;
}
