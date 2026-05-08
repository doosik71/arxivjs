const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, 'arxivjsdata');
const TARGET_EXTENSIONS = ['.json', '.md', '.txt', '.hlt'];

function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    verbose: argv.includes('--verbose')
  };
}

async function getTopicDirectories(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(rootPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function getJsonFiles(topicPath) {
  const entries = await fs.readdir(topicPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function buildRenamePlan(topicPath, jsonFileName) {
  const currentBaseName = path.basename(jsonFileName, '.json');
  const jsonPath = path.join(topicPath, jsonFileName);
  const paper = await readJson(jsonPath);

  if (!paper?.title) {
    throw new Error('Missing title field in JSON metadata.');
  }

  const targetBaseName = slugifyTitle(paper.title);

  if (!targetBaseName) {
    throw new Error(`Unable to derive a filename from title "${paper.title}".`);
  }

  const renames = [];

  for (const extension of TARGET_EXTENSIONS) {
    const sourcePath = path.join(topicPath, `${currentBaseName}${extension}`);
    const targetPath = path.join(topicPath, `${targetBaseName}${extension}`);

    if (!(await fileExists(sourcePath))) {
      continue;
    }

    renames.push({
      extension,
      sourcePath,
      targetPath
    });
  }

  return {
    currentBaseName,
    targetBaseName,
    title: paper.title,
    renames
  };
}

async function validatePlan(plan) {
  if (!plan.renames.length) {
    return { status: 'skipped', reason: 'no-files' };
  }

  if (plan.currentBaseName === plan.targetBaseName) {
    return { status: 'skipped', reason: 'already-migrated' };
  }

  for (const rename of plan.renames) {
    if (rename.sourcePath === rename.targetPath) {
      continue;
    }

    if (await fileExists(rename.targetPath)) {
      return {
        status: 'conflict',
        reason: `Target already exists: ${path.basename(rename.targetPath)}`
      };
    }
  }

  return { status: 'ready' };
}

async function applyPlan(plan) {
  for (const rename of plan.renames) {
    if (rename.sourcePath === rename.targetPath) {
      continue;
    }

    await fs.rename(rename.sourcePath, rename.targetPath);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const topicPaths = await getTopicDirectories(DATA_PATH);
  const stats = {
    processed: 0,
    renamed: 0,
    skipped: 0,
    conflicts: 0,
    failed: 0
  };

  console.log(`[start] migrate_arxivjsdata.js (${options.apply ? 'apply' : 'dry-run'})`);
  console.log(`[start] data path: ${DATA_PATH}`);

  for (const topicPath of topicPaths) {
    const topicName = path.basename(topicPath);
    const jsonFiles = await getJsonFiles(topicPath);

    if (!jsonFiles.length) {
      continue;
    }

    console.log(`\n[topic] ${topicName} (${jsonFiles.length} metadata files)`);

    for (const jsonFileName of jsonFiles) {
      stats.processed += 1;

      try {
        const plan = await buildRenamePlan(topicPath, jsonFileName);
        const validation = await validatePlan(plan);

        if (validation.status === 'skipped') {
          stats.skipped += 1;

          if (options.verbose) {
            console.log(`[skip] ${topicName}/${plan.currentBaseName} ${validation.reason}`);
          }

          continue;
        }

        if (validation.status === 'conflict') {
          stats.conflicts += 1;
          console.error(`[conflict] ${topicName}/${plan.currentBaseName} -> ${plan.targetBaseName} (${validation.reason})`);
          continue;
        }

        if (options.apply) {
          await applyPlan(plan);
          stats.renamed += 1;
          console.log(`[renamed] ${topicName}/${plan.currentBaseName} -> ${plan.targetBaseName}`);
        } else {
          stats.renamed += 1;
          console.log(`[plan] ${topicName}/${plan.currentBaseName} -> ${plan.targetBaseName}`);
        }
      } catch (error) {
        stats.failed += 1;
        console.error(`[fail] ${topicName}/${path.basename(jsonFileName, '.json')} ${error.message}`);
      }
    }
  }

  console.log('\n[summary]');
  console.log(`processed: ${stats.processed}`);
  console.log(`${options.apply ? 'renamed' : 'planned'}: ${stats.renamed}`);
  console.log(`skipped: ${stats.skipped}`);
  console.log(`conflicts: ${stats.conflicts}`);
  console.log(`failed: ${stats.failed}`);

  if (!options.apply) {
    console.log('\n[hint] Run "node migrate_arxivjsdata.js --apply" to perform the rename.');
  }
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exitCode = 1;
});
