import * as core from '@actions/core'
import readFileBase64 from './read-file'
import findActionFileName from './find-action-file-name'
import { getActionEntrypoints } from './get-action-entrypoints'
import { resolvePublishableFiles } from './resolve-publishable-files'
import { getAdditionalFilesFromInput } from '../inputs'
import type { ActionContext } from '../context'

type TreeEntry = {
    path: string
    mode: '100644'
    type: 'blob'
    sha: string
}

export default async function createCommit(ctx: ActionContext, commitMessage: string) {
    const packageJson = ctx.getPackageJSON<{ main?: string; files?: string[] }>()
    const actionFileName = findActionFileName(ctx.workspace)

    const candidatePaths = [
        actionFileName,
        ...getActionEntrypoints(ctx.workspace, actionFileName),
        ...(packageJson.main ? [packageJson.main] : []),
        ...getAdditionalFilesFromInput(),
        ...(packageJson.files ?? [])
    ]

    const paths = new Set(await resolvePublishableFiles(ctx.workspace, candidatePaths))

    if (!packageJson.main && paths.size === 1) {
        throw new Error('Property "main" does not exist in your `package.json` and no action run entrypoints were found.')
    }

    core.info('Creating tree')
    const treeEntries: TreeEntry[] = []
    for (const filePath of paths) {
        treeEntries.push({
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: (await createBlob(ctx, filePath)).sha!
        })
    }

    const tree = await ctx.github.rest.git.createTree({
        ...ctx.repo,
        tree: treeEntries
    })
    core.info('Tree created')

    core.info('Creating commit')
    const commit = await ctx.github.rest.git.createCommit({
        ...ctx.repo,
        message: commitMessage,
        tree: tree.data.sha,
        parents: [ctx.sha]
    })
    core.info(`Commit created (${commit.data.sha})`)

    return commit.data
}

async function createBlob(ctx: ActionContext, filePath: string) {
    const content = await readFileBase64(ctx.workspace, filePath)
    const blob = await ctx.github.rest.git.createBlob({
        ...ctx.repo,
        content,
        encoding: 'base64'
    })
    return blob.data
}
