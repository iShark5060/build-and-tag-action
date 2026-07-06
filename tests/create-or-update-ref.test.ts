import { describe, test, expect, beforeEach, vi } from 'vitest'
import createOrUpdateRef from '../src/lib/create-or-update-ref'
import { createMockGithub, generateContext } from './helpers'
import type { ActionContext } from '../src/context'

describe('create-or-update-ref', () => {
    let ctx: ActionContext

    beforeEach(() => {
        ctx = generateContext()
    })

    test('updates the ref if it already exists', async () => {
        ctx = generateContext({
            github: createMockGithub({
                getRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/tags/v1' } })
            })
        })

        await createOrUpdateRef(ctx, '123abc', 'v1')

        expect(ctx.github.rest.git.updateRef).toHaveBeenCalledWith(
            expect.objectContaining({
                ref: 'tags/v1',
                sha: '123abc',
                force: true
            })
        )
    })

    test('creates a new ref if it does not already exist', async () => {
        await createOrUpdateRef(ctx, '123abc', 'v1')

        expect(ctx.github.rest.git.createRef).toHaveBeenCalledWith(
            expect.objectContaining({
                ref: 'refs/tags/v1',
                sha: '123abc'
            })
        )
    })

    test('creates a new minor ref if it does not already exist', async () => {
        await createOrUpdateRef(ctx, '123abc', 'v1.0')

        expect(ctx.github.rest.git.createRef).toHaveBeenCalledWith(
            expect.objectContaining({
                ref: 'refs/tags/v1.0',
                sha: '123abc'
            })
        )
    })

    test('creates the release tag if it does not already exist', async () => {
        await createOrUpdateRef(ctx, '123abc', 'v1.0.0')

        expect(ctx.github.rest.git.createRef).toHaveBeenCalledWith(
            expect.objectContaining({
                ref: 'refs/tags/v1.0.0',
                sha: '123abc'
            })
        )
    })
})
