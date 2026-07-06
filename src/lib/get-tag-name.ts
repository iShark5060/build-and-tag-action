import { getTagNameInput, type ActionContext } from '../context'

export default function getTagName(ctx: ActionContext): string {
    const tagNameInput = getTagNameInput()
    if (tagNameInput) {
        return tagNameInput
    }

    if (ctx.eventName === 'release') {
        const release = ctx.payload.release as { tag_name?: string } | undefined
        if (release?.tag_name) {
            return release.tag_name
        }
    }

    throw new Error('No tag_name was found or provided!')
}
