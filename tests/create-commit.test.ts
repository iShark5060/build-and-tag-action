import { describe, test, expect, beforeEach } from 'vitest'
import createCommit from '../src/lib/create-commit'
import { generateContext } from './helpers'
import type { ActionContext } from '../src/context'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('create-commit', () => {
    let ctx: ActionContext

    beforeEach(() => {
        process.env.INPUT_ADDITIONAL_FILES = ''
        ctx = generateContext()
    })

    test('creates the tree and commit', async () => {
        await createCommit(ctx, 'Automatic compilation')

        expect(ctx.github.rest.git.createBlob).toHaveBeenCalled()
        expect(ctx.github.rest.git.createTree).toHaveBeenCalledWith(
            expect.objectContaining({
                owner: 'JasonEtco',
                repo: 'test',
                tree: expect.arrayContaining([
                    expect.objectContaining({ path: 'action.yml' }),
                    expect.objectContaining({ path: 'index.js' })
                ])
            })
        )
        expect(ctx.github.rest.git.createCommit).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Automatic compilation',
                parents: [ctx.sha]
            })
        )
    })

    test('uses a custom commit message', async () => {
        await createCommit(ctx, 'Release build')

        expect(ctx.github.rest.git.createCommit).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Release build' })
        )
    })

    test('includes additional files from input', async () => {
        process.env.INPUT_ADDITIONAL_FILES = 'additional.js'
        await createCommit(ctx, 'Automatic compilation')

        expect(ctx.github.rest.git.createTree).toHaveBeenCalledWith(
            expect.objectContaining({
                tree: expect.arrayContaining([expect.objectContaining({ path: 'additional.js' })])
            })
        )
    })

    test('includes pre and post entrypoints from action.yml', async () => {
        const workspace = path.join(__dirname, 'fixtures', 'workspace-composite')
        ctx = generateContext({ workspace })

        await createCommit(ctx, 'Automatic compilation')

        expect(ctx.github.rest.git.createTree).toHaveBeenCalledWith(
            expect.objectContaining({
                tree: expect.arrayContaining([
                    expect.objectContaining({ path: 'dist/restore/index.js' }),
                    expect.objectContaining({ path: 'dist/save/index.js' })
                ])
            })
        )
    })

    test('throws when package.json has no main and no action entrypoints', async () => {
        const workspace = path.join(__dirname, 'fixtures', 'workspace-no-entrypoints')
        ctx = generateContext({
            workspace,
            getPackageJSON: () => ({})
        })
        await expect(createCommit(ctx, 'Automatic compilation')).rejects.toThrow(
            'Property "main" does not exist in your `package.json` and no action run entrypoints were found.'
        )
    })
})
