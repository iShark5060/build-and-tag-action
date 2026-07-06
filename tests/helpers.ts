import { vi } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { createContext, type ActionContext } from '../src/context'

type MockGithub = ActionContext['github']

export function createMockGithub(overrides?: Partial<MockGithub['rest']['git']>): MockGithub {
    const git = {
        createBlob: vi.fn().mockResolvedValue({ data: { sha: 'blob-sha' } }),
        createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree-sha' } }),
        createCommit: vi.fn().mockResolvedValue({ data: { sha: '123abc' } }),
        updateRef: vi.fn().mockResolvedValue({}),
        getRef: vi.fn().mockRejectedValue({ status: 404 }),
        createRef: vi.fn().mockResolvedValue({}),
        ...overrides
    }

    return {
        rest: { git }
    } as unknown as MockGithub
}

export function generateContext(overrides?: Partial<ActionContext>): ActionContext {
    const ctx = {
        ...createContext(),
        github: createMockGithub(),
        ...overrides
    }

    if (overrides?.workspace && !overrides.getPackageJSON) {
        const workspace = overrides.workspace
        ctx.getPackageJSON = <T extends object>() => {
            const packagePath = path.join(workspace, 'package.json')
            return JSON.parse(readFileSync(packagePath, { encoding: 'utf8' })) as T
        }
    }

    return ctx
}
