import { Octokit } from "octokit";

export interface FileEntry {
  path: string;
  content: string;
  isBinary: boolean;
}

export interface BlobResult {
  path: string;
  sha: string;
}

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg", ".bmp", ".tiff",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm",
  ".wasm", ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

export function isBinaryFile(filename: string, size: number): boolean {
  if (size > 1024 * 1024) return true; // >1MB treat as binary
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export async function fetchRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<FileEntry[]> {
  // Resolve the ref to use — default to repo's default branch
  let resolvedRef = ref;
  if (!resolvedRef) {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    resolvedRef = repoData.default_branch;
  }

  // Single API call to get the entire file tree
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: resolvedRef,
    recursive: "true",
  });

  // Filter to blobs (files) only, apply subpath filter
  const prefix = path ? path + "/" : "";
  const blobs = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.sha &&
      item.path &&
      (!prefix || item.path.startsWith(prefix))
  );

  // Download all blob contents in parallel batches
  const files: FileEntry[] = [];
  const batchSize = 20;

  for (let i = 0; i < blobs.length; i += batchSize) {
    const batch = blobs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (blob) => {
        const { data } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: blob.sha!,
        });
        const binary = isBinaryFile(blob.path!, data.size ?? 0);
        return {
          path: blob.path!,
          content: binary
            ? data.content
            : Buffer.from(data.content, "base64").toString("utf-8"),
          isBinary: binary,
        };
      })
    );
    files.push(...results);
  }

  return files;
}

/** Wait for auto_init commit to be available, with retries */
export async function waitForRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  refName: string,
  maxRetries = 8
): Promise<string> {
  // Initial delay to let GitHub's git backend initialize
  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: refName,
      });
      return ref.object.sha;
    } catch (error: unknown) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff capped at 10s
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, i), 10_000)));
    }
  }
  throw new Error("Failed to get ref after retries");
}

/** Create a single blob with retry logic */
export async function createBlobWithRetry(
  octokit: Octokit,
  owner: string,
  repo: string,
  file: FileEntry,
  maxRetries = 5
): Promise<BlobResult> {
  const content = file.isBinary
    ? file.content // already base64
    : Buffer.from(file.content).toString("base64");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content,
        encoding: "base64",
      });
      return { path: file.path, sha: blob.sha };
    } catch (error: unknown) {
      if (attempt === maxRetries - 1) throw error;
      // Longer backoff for "Git Repository is empty" errors
      const errMsg = error instanceof Error ? error.message : String(error);
      const delay = errMsg.includes("Git Repository is empty")
        ? Math.min(3000 * Math.pow(2, attempt), 15_000)
        : Math.min(1000 * Math.pow(2, attempt), 10_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed to create blob for ${file.path}`);
}

/** Create blobs in batches to avoid overwhelming the API */
export async function createBlobsBatched(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: FileEntry[],
  batchSize = 10
): Promise<BlobResult[]> {
  const results: BlobResult[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((file) => createBlobWithRetry(octokit, owner, repo, file))
    );
    results.push(...batchResults);
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < files.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

export async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: FileEntry[],
  message: string
) {
  console.log(`[commitFiles] Waiting for main branch ref...`);
  const parentSha = await waitForRef(octokit, owner, repo, "heads/main");
  console.log(`[commitFiles] Got parent SHA: ${parentSha}`);

  // Resolve commit SHA to tree SHA — createTree requires a tree SHA for base_tree
  console.log(`[commitFiles] Getting parent commit...`);
  const { data: parentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });
  const baseTreeSha = parentCommit.tree.sha;
  console.log(`[commitFiles] Got base tree SHA: ${baseTreeSha}`);

  // Use inline content for text files (no blob creation needed).
  // Only create blobs for binary files (GitHub createTree doesn't support binary inline).
  const binaryFiles = files.filter((f) => f.isBinary);
  const textFiles = files.filter((f) => !f.isBinary);
  console.log(`[commitFiles] ${textFiles.length} text files (inline), ${binaryFiles.length} binary files (blobs)`);

  let binaryBlobs: BlobResult[] = [];
  if (binaryFiles.length > 0) {
    binaryBlobs = await createBlobsBatched(octokit, owner, repo, binaryFiles);
    console.log(`[commitFiles] Created ${binaryBlobs.length} binary blobs`);
  }

  type TreeItem = {
    path: string;
    mode: "100644";
    type: "blob";
    content?: string;
    sha?: string;
  };

  const treeItems: TreeItem[] = [
    ...textFiles.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    })),
    ...binaryBlobs.map((blob) => ({
      path: blob.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blob.sha,
    })),
  ];

  // Retry createTree — GitHub's git backend can lag behind repo creation
  // Try with base_tree first, then without if it fails (creates new tree from scratch)
  console.log(`[commitFiles] Creating tree with ${treeItems.length} items, base_tree: ${baseTreeSha}`);
  let tree;
  let useBaseTree = true;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const treeParams: {
        owner: string;
        repo: string;
        tree: typeof treeItems;
        base_tree?: string;
      } = {
        owner,
        repo,
        tree: treeItems,
      };

      // After 3 failed attempts with base_tree, try without it
      if (useBaseTree && attempt < 3) {
        treeParams.base_tree = baseTreeSha;
      } else if (attempt === 3) {
        console.log(`[commitFiles] Switching to create tree without base_tree`);
        useBaseTree = false;
      }

      const result = await octokit.rest.git.createTree(treeParams);
      tree = result.data;
      console.log(`[commitFiles] Tree created successfully: ${tree.sha}`);
      break;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (attempt === 7) {
        console.log(`[commitFiles] createTree failed after 8 attempts: ${errMsg}`);
        throw error;
      }
      // Exponential backoff capped at 15s to avoid exceeding 600s action limit
      const delay = Math.min(3000 * Math.pow(2, attempt), 15_000);
      console.log(`[commitFiles] createTree attempt ${attempt + 1} failed (${errMsg}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (!tree) throw new Error("Failed to create git tree");

  console.log(`[commitFiles] Creating commit...`);
  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [parentSha],
  });
  console.log(`[commitFiles] Commit created: ${commit.sha}`);

  console.log(`[commitFiles] Updating ref...`);
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: commit.sha,
  });
  console.log(`[commitFiles] Done!`);
}
