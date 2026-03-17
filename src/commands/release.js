'use strict';

/**
 * shiplet release  — streamlined release pipeline
 *
 * Pre-release checks → version bump → changelog → git tag → build image → push/publish
 *
 * Supports:
 *   shiplet release patch          bump patch (1.0.0 → 1.0.1)
 *   shiplet release minor          bump minor (1.0.0 → 1.1.0)
 *   shiplet release major          bump major (1.0.0 → 2.0.0)
 *   shiplet release 2.3.0          explicit version
 *   shiplet release --pre beta     1.0.0 → 1.0.1-beta.0
 *   shiplet release --dry-run      simulate everything, no mutations
 *   shiplet release --skip-tests
 *   shiplet release --skip-build
 *   shiplet release --skip-push
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const {
    findProjectRoot, header, info, warn, error,
    detectRuntime, getComposeCmd, resolveComposeFile,
} = require('../utils/helpers');

// ── SemVer helpers ────────────────────────────────────────────────────────────

function parseSemver(v) {
    const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/);
    if (!m) return null;
    return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null };
}

function bumpVersion(current, bump, preTag) {
    const v = parseSemver(current);
    if (!v) throw new Error(`Cannot parse current version: ${current}`);

    let { major, minor, patch } = v;

    if (bump === 'major') { major++; minor = 0; patch = 0; }
    else if (bump === 'minor') { minor++; patch = 0; }
    else if (bump === 'patch') { patch++; }
    else {
        // explicit version
        const explicit = parseSemver(bump);
        if (!explicit) throw new Error(`Invalid version: ${bump}`);
        return preTag
            ? `${explicit.major}.${explicit.minor}.${explicit.patch}-${preTag}.0`
            : `${explicit.major}.${explicit.minor}.${explicit.patch}`;
    }

    return preTag
        ? `${major}.${minor}.${patch}-${preTag}.0`
        : `${major}.${minor}.${patch}`;
}

// ── Git helpers ───────────────────────────────────────────────────────────────

function git(cmd, opts = {}) {
    return execSync(`git ${cmd}`, { stdio: 'pipe', ...opts }).toString().trim();
}

function gitSafe(cmd) {
    try { return git(cmd); } catch { return ''; }
}

function isGitRepo(root) { return fs.existsSync(path.join(root, '.git')); }
function isGitClean(root) {
    const status = gitSafe('status --porcelain');
    return status === '';
}
function currentBranch() { return gitSafe('branch --show-current'); }
function getLastTag() { return gitSafe('describe --tags --abbrev=0') || null; }
function commitsSinceTag(tag) {
    if (!tag) return gitSafe('log --oneline').split('\n').filter(Boolean);
    return gitSafe(`log ${tag}..HEAD --oneline`).split('\n').filter(Boolean);
}

// ── Changelog generator ───────────────────────────────────────────────────────

const CC_TYPES = {
    feat: { label: '🚀 Features', emoji: '✨' },
    fix: { label: '🐛 Bug Fixes', emoji: '🔧' },
    perf: { label: '⚡ Performance', emoji: '⚡' },
    refactor: { label: '♻️  Refactoring', emoji: '♻️' },
    docs: { label: '📝 Documentation', emoji: '📝' },
    test: { label: '🧪 Tests', emoji: '🧪' },
    chore: { label: '🔨 Chores', emoji: '🔨' },
    ci: { label: '🤖 CI/CD', emoji: '🤖' },
    build: { label: '📦 Build', emoji: '📦' },
    style: { label: '💄 Style', emoji: '💄' },
    breaking: { label: '💥 Breaking Changes', emoji: '💥' },
};

function parseConventionalCommit(line) {
    // "abc1234 feat(scope): description"
    const m = line.match(/^[a-f0-9]+\s+(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/);
    if (!m) return { type: 'other', scope: null, breaking: false, desc: line.replace(/^[a-f0-9]+\s+/, '') };
    return {
        type: m[3] ? 'breaking' : m[1],
        scope: m[2] || null,
        breaking: !!m[3],
        desc: m[4],
    };
}

function buildChangelog(version, commits) {
    const date = new Date().toISOString().split('T')[0];
    const groups = {};

    for (const line of commits) {
        const c = parseConventionalCommit(line);
        const key = CC_TYPES[c.type] ? c.type : 'other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    }

    const lines = [`## [${version}] — ${date}\n`];

    const order = ['breaking', 'feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'chore', 'ci', 'build', 'style', 'other'];
    for (const type of order) {
        if (!groups[type] || !groups[type].length) continue;
        const label = CC_TYPES[type]?.label || '📌 Other';
        lines.push(`### ${label}\n`);
        for (const c of groups[type]) {
            const scope = c.scope ? `**${c.scope}:** ` : '';
            lines.push(`- ${scope}${c.desc}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

function prependChangelog(root, content) {
    const clPath = path.join(root, 'CHANGELOG.md');
    const existing = fs.existsSync(clPath) ? fs.readFileSync(clPath, 'utf8') : '# Changelog\n\n';
    const header_ = existing.startsWith('# Changelog') ? existing : '# Changelog\n\n' + existing;
    const [title, ...rest] = header_.split('\n');
    fs.writeFileSync(clPath, [title, '', content, ...rest].join('\n'));
}

// ── Pre-release checks ────────────────────────────────────────────────────────

async function runPreChecks(root, opts) {
    const checks = [];

    // 1. Git repo
    checks.push({
        name: 'Git repository',
        run: () => isGitRepo(root),
        fix: 'Run `git init` first.',
    });

    // 2. Clean working tree
    checks.push({
        name: 'Clean working tree',
        run: () => isGitClean(root),
        fix: 'Commit or stash your changes before releasing.',
        warn: true,
    });

    // 3. On main/master
    checks.push({
        name: 'On main branch',
        run: () => ['main', 'master'].includes(currentBranch()),
        fix: `You are on branch ${chalk.cyan(currentBranch())}. Switch to main/master or use --force.`,
        warn: true,
    });

    // 4. package.json exists
    checks.push({
        name: 'package.json exists',
        run: () => fs.existsSync(path.join(root, 'package.json')),
        fix: 'No package.json found.',
    });

    console.log('');
    let hasErrors = false;

    for (const check of checks) {
        const passed = (() => { try { return check.run(); } catch { return false; } })();
        if (passed) {
            console.log(chalk.green('  ✔  ') + check.name);
        } else if (check.warn) {
            console.log(chalk.yellow('  ⚠  ') + check.name + chalk.gray('  — ' + check.fix));
        } else {
            console.log(chalk.red('  ✖  ') + check.name + chalk.gray('  — ' + check.fix));
            hasErrors = true;
        }
    }
    console.log('');

    if (hasErrors && !opts.force) {
        error('Pre-release checks failed. Fix issues above or use --force to skip.', 1);
    }
}

// ── Main release command ──────────────────────────────────────────────────────

module.exports = async function releaseCommand(bump = 'patch', options = {}) {
    const root = findProjectRoot() || process.cwd();
    header('Shiplet Release Pipeline');

    const isDry = options.dryRun;
    const preTag = options.pre || null;

    if (isDry) {
        console.log(chalk.yellow('  ── DRY RUN MODE — no files will be changed ──\n'));
    }

    // ── Read current version ───────────────────────────────────────────────────
    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) { error('No package.json found.', 1); }
    let pkg;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (e) {
        error('Could not parse package.json: ' + e.message, 1);
    }
    const currentVersion = pkg.version || '0.0.0';

    let nextVersion;
    try {
        nextVersion = bumpVersion(currentVersion, bump, preTag);
    } catch (e) {
        error(e.message, 1);
    }

    info(`Current version : ${chalk.gray(currentVersion)}`);
    info(`Next version    : ${chalk.cyan(nextVersion)}`);
    if (isDry) { console.log(''); }

    // ── Confirm ────────────────────────────────────────────────────────────────
    if (!options.yes && !isDry) {
        const { confirmed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: `Release ${chalk.cyan('v' + nextVersion)}?`,
            default: true,
        }]);
        if (!confirmed) { info('Release cancelled.'); process.exit(0); }
    }

    // ── Pre-release checks ─────────────────────────────────────────────────────
    info('Running pre-release checks…');
    await runPreChecks(root, options);

    // ── Tests ──────────────────────────────────────────────────────────────────
    if (!options.skipTests) {
        const spinner = ora('Running tests…').start();
        if (!isDry) {
            const testResult = spawnSync('node', [path.join(__dirname, 'test.js')], {
                cwd: root, stdio: 'pipe',
            });
            if (testResult.status !== 0) {
                spinner.fail('Tests failed. Fix them before releasing, or use --skip-tests.');
                console.error(testResult.stdout?.toString());
                process.exit(1);
            }
        }
        spinner.succeed('Tests passed.');
    } else {
        warn('Skipping tests (--skip-tests).');
    }

    // ── Bump package.json ──────────────────────────────────────────────────────
    const bumpSpinner = ora(`Bumping version to ${nextVersion}…`).start();
    if (!isDry) {
        pkg.version = nextVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

        // also bump any workspaces root
        const otherPkgs = ['package-lock.json'];
        for (const f of otherPkgs) {
            const fp = path.join(root, f);
            if (fs.existsSync(fp)) {
                try {
                    const lock = JSON.parse(fs.readFileSync(fp, 'utf8'));
                    if (lock.version) { lock.version = nextVersion; fs.writeFileSync(fp, JSON.stringify(lock, null, 2) + '\n'); }
                } catch { /* ignore */ }
            }
        }
    }
    bumpSpinner.succeed(`package.json → ${chalk.cyan(nextVersion)}`);

    // ── Changelog ─────────────────────────────────────────────────────────────
    const clSpinner = ora('Generating CHANGELOG.md…').start();
    const lastTag = getLastTag();
    const commits = commitsSinceTag(lastTag);
    const clEntry = buildChangelog(nextVersion, commits);

    if (!isDry) {
        prependChangelog(root, clEntry);
    }
    clSpinner.succeed(`CHANGELOG.md updated  ${chalk.gray('(' + commits.length + ' commit(s) since ' + (lastTag || 'beginning') + ')')}`);

    if (isDry) {
        console.log('\n' + chalk.gray('  ── Changelog preview ──'));
        console.log(chalk.gray(clEntry.split('\n').map(l => '  ' + l).join('\n')));
    }

    // ── Git commit + tag ───────────────────────────────────────────────────────
    const gitSpinner = ora('Committing and tagging…').start();
    const tag = `v${nextVersion}`;

    if (!isDry) {
        try {
            git('add package.json package-lock.json CHANGELOG.md');
            git(`commit -m "chore(release): ${tag}"`);
            git(`tag -a ${tag} -m "Release ${tag}"`);
        } catch (e) {
            gitSpinner.fail('Git commit/tag failed: ' + e.message);
            process.exit(1);
        }
    }
    gitSpinner.succeed(`Git commit + tag ${chalk.cyan(tag)}`);

    // ── Container image build ──────────────────────────────────────────────────
    if (!options.skipBuild) {
        const runtime = detectRuntime(root) || 'docker';
        const [bin, ...baseCompose] = getComposeCmd(runtime);
        const composeFile = resolveComposeFile(root);
        const fileFlag = composeFile ? ['-f', composeFile] : [];
        const imgSpinner = ora(`Building container image (${runtime})…`).start();

        if (!isDry) {
            const result = spawnSync(
                bin,
                [...baseCompose, ...fileFlag, 'build', '--no-cache'],
                { cwd: root, stdio: 'pipe' }
            );
            if (result.status !== 0) {
                imgSpinner.fail('Container build failed.');
                console.error(result.stderr?.toString());
                warn('Release continues — fix the image separately.');
            } else {
                imgSpinner.succeed(`Container image built and tagged ${chalk.cyan(tag)}`);
            }
        } else {
            imgSpinner.succeed('Container image build (dry-run — skipped).');
        }
    } else {
        warn('Skipping container build (--skip-build).');
    }

    // ── Push ──────────────────────────────────────────────────────────────────
    if (!options.skipPush) {
        const pushSpinner = ora('Pushing git tags…').start();
        if (!isDry) {
            try {
                git('push');
                git('push --tags');
            } catch {
                pushSpinner.warn('Could not push (no remote?). Push manually: git push && git push --tags');
            }
        }
        pushSpinner.succeed('Git push + tags pushed.');
    } else {
        warn('Skipping git push (--skip-push).');
    }

    // ── npm publish (optional) ─────────────────────────────────────────────────
    if (options.publish) {
        const pubSpinner = ora('Publishing to npm…').start();
        const publishArgs = ['publish'];
        if (preTag) publishArgs.push('--tag', preTag);
        if (options.access) publishArgs.push('--access', options.access);

        if (!isDry) {
            const result = spawnSync('npm', publishArgs, { cwd: root, stdio: 'pipe' });
            if (result.status !== 0) {
                pubSpinner.fail('npm publish failed.');
                console.error(result.stderr?.toString());
            } else {
                pubSpinner.succeed(`Published to npm as ${chalk.cyan(pkg.name + '@' + nextVersion)}`);
            }
        } else {
            pubSpinner.succeed('npm publish (dry-run — skipped).');
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`
${chalk.bold.green('  ✅ Release complete!')}

  ${chalk.gray('Version')}   ${chalk.gray(currentVersion)} → ${chalk.cyan.bold(nextVersion)}
  ${chalk.gray('Tag')}       ${chalk.cyan(tag)}
  ${chalk.gray('Changelog')} CHANGELOG.md updated
  ${isDry ? chalk.yellow('\n  (DRY RUN — no permanent changes were made)') : ''}
  `);
};
