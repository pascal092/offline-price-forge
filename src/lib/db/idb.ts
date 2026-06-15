import { openDB, type IDBPDatabase } from "idb";
import type { Article, CatalogMeta, Project } from "@/lib/pricing/types";

const DB_NAME = "zinco-pwa";
const DB_VERSION = 1;

type Schema = {
  articles: Article;
  projects: Project;
  meta: unknown;
};

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("articles")) {
          db.createObjectStore("articles", { keyPath: "artikel_nr" });
        }
        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

export async function replaceCatalog(articles: Article[], meta: CatalogMeta): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["articles", "meta"], "readwrite");
  await tx.objectStore("articles").clear();
  const store = tx.objectStore("articles");
  for (const a of articles) {
    await store.put(a);
  }
  await tx.objectStore("meta").put(meta, "lastImport");
  await tx.done;
}

export async function getAllArticles(): Promise<Article[]> {
  const db = await getDB();
  return (await db.getAll("articles")) as Article[];
}

export async function getCatalogMeta(): Promise<CatalogMeta | null> {
  const db = await getDB();
  return ((await db.get("meta", "lastImport")) as CatalogMeta | undefined) ?? null;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put("projects", project);
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const list = (await db.getAll("projects")) as Project[];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projects", id);
}

export async function clearProjects(): Promise<void> {
  const db = await getDB();
  await db.clear("projects");
}

// avoid unused type warning
export type _Schema = Schema;
