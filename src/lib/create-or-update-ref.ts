import * as core from '@actions/core'
import type { ActionContext } from '../context'

export default async function createOrUpdateRef(
    ctx: ActionContext,
    sha: string,
    tagName: string
) {
    const refName = `tags/${tagName}`
    core.info(`Checking if version tag ${refName} already exists...`)

    const refExists = await ctx.github.rest.git
        .getRef({ ...ctx.repo, ref: refName })
        .then(() => true)
        .catch((error: { status?: number }) => {
            if (error.status === 404) {
                return false
            }
            throw error
        })

    if (refExists) {
        core.info(`Tag ${refName} already exists, updating it.`)
        await ctx.github.rest.git.updateRef({
            ...ctx.repo,
            force: true,
            ref: refName,
            sha
        })
    } else {
        core.info(`Tag ${refName} does not exist, creating it.`)
        await ctx.github.rest.git.createRef({
            ...ctx.repo,
            ref: `refs/${refName}`,
            sha
        })
    }
}
