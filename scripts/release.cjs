const args = require('minimist')(process.argv.slice(2))
const path = require('path')
const fs = require('fs')
const execa = require('execa')
const { prompt } = require('enquirer')
const semver = require('semver')
const { dye } = require('@prostojs/dye')

const rootDir = path.resolve(__dirname, '..')
const rootPkgPath = path.join(rootDir, 'package.json')
const rootPkg = require(rootPkgPath)
const version = rootPkg.version

const run = (bin, args, opts = {}) =>
    execa(bin, args, { stdio: 'inherit', ...opts })

const step = dye('cyan').prefix('\n').attachConsole()
const error = dye('red-bright').attachConsole('error')
const good = dye('green', 'bold').prefix('\n✓ ').attachConsole()
const info = dye('green', 'dim').attachConsole('info')

const branch = execa.sync('git', ['branch', '--show-current']).stdout
const inc = (i) => {
    if (['prerelease', 'premajor'].includes(i.split(' ')[0])) {
        const [action, pre] = i.split(' ')
        return semver.inc(version, action, pre)
    } else {
        return semver.inc(version, i)
    }
}

const isDryRun = args.dry
const skipTests = args.skipTests
const skipBuild = args.skipBuild

const gitStatus = execa.sync('git', ['status']).stdout
if (gitStatus.indexOf('nothing to commit, working tree clean') < 0) {
    error('Please commit all the changes first.')
    process.exit(1)
}

/**
 * Find all workspace package.json files and sync their version.
 */
function syncVersions(targetVersion) {
    // Read workspace patterns from pnpm-workspace.yaml
    const workspaceYaml = fs.readFileSync(
        path.join(rootDir, 'pnpm-workspace.yaml'),
        'utf-8',
    )
    const patterns = []
    for (const line of workspaceYaml.split('\n')) {
        const match = line.match(/^\s+-\s+(.+)$/)
        if (match) patterns.push(match[1].trim())
    }

    // Resolve patterns to directories
    const dirs = []
    for (const pattern of patterns) {
        if (pattern.includes('*')) {
            // Glob: e.g. "examples/*"
            const base = pattern.replace('/*', '')
            const baseDir = path.join(rootDir, base)
            if (fs.existsSync(baseDir)) {
                for (const entry of fs.readdirSync(baseDir, {
                    withFileTypes: true,
                })) {
                    if (entry.isDirectory()) {
                        dirs.push(path.join(baseDir, entry.name))
                    }
                }
            }
        } else {
            dirs.push(path.join(rootDir, pattern))
        }
    }

    // Update each workspace package.json
    const updated = []
    for (const dir of dirs) {
        const pkgPath = path.join(dir, 'package.json')
        if (!fs.existsSync(pkgPath)) continue
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (pkg.version !== undefined) {
            pkg.version = targetVersion
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n')
            updated.push(path.relative(rootDir, pkgPath))
        }
    }

    // Update root package.json
    rootPkg.version = targetVersion
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 4) + '\n')
    updated.push('package.json')

    return updated
}

main()

async function main() {
    let targetVersion = version
    if (branch === 'main') {
        const versionIncrements = [
            'patch',
            'minor',
            'prerelease alpha',
            'prerelease beta',
            'preminor alpha',
            'preminor beta',
            'premajor alpha',
            'premajor beta',
            'major',
        ]

        const { release } = await prompt({
            type: 'select',
            name: 'release',
            message: `Select release type (current: ${version})`,
            choices: versionIncrements.map((i) => `${i} (${inc(i)})`),
        })

        targetVersion = release.match(/\((.*)\)/)[1]

        if (!semver.valid(targetVersion)) {
            throw new Error(`invalid target version: ${targetVersion}`)
        }

        const { yes } = await prompt({
            type: 'confirm',
            name: 'yes',
            message: `Releasing v${targetVersion}. Confirm?`,
        })

        if (!yes) {
            return
        }

        // run tests before release
        step('Running tests...')
        if (!skipTests && !isDryRun) {
            await run('pnpm', ['test'])
        } else {
            info(`(skipped)`)
        }

        step('Running lint...')
        if (!skipTests && !isDryRun) {
            await run('pnpm', ['lint'])
        } else {
            info(`(skipped)`)
        }

        // build
        step('Building package...')
        if (!skipBuild && !isDryRun) {
            await run('pnpm', ['build'])
        } else {
            info(`(skipped)`)
        }

        // Sync version across all workspace package.json files
        step('Syncing version to ' + targetVersion + ' ...')
        const updated = syncVersions(targetVersion)
        for (const f of updated) {
            info(`  updated ${f}`)
        }

        // Generate changelog
        step('Generating changelog...')
        await run('pnpm', ['changelog'])

        // Commit, tag
        step('Committing changes...')
        execa.sync('git', ['add', '-A'])
        execa.sync('git', ['commit', '-m', `release: v${targetVersion}`])
        execa.sync('git', ['tag', `v${targetVersion}`])
    } else {
        error('Branch "main" expected')
        process.exit(1)
    }

    step('Pushing changes ...')
    execa.sync('git', ['push'])

    step('Pushing tags ...')
    execa.sync('git', ['push', '--tags'])

    step('Publishing ...')
    execa.sync('pnpm', ['publish', '--access', 'public'], {
        cwd: path.join(rootDir, 'lib'),
    })

    good('All done!')
}
