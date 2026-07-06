import { describe, test, expect, beforeEach } from 'vitest'
import getTagName from '../src/lib/get-tag-name'
import { generateContext } from './helpers'
import type { ActionContext } from '../src/context'

describe('get-tag-name', () => {
    let ctx: ActionContext

    beforeEach(() => {
        process.env.INPUT_TAG_NAME = ''
        ctx = generateContext()
    })

    test('gets the tag from the release payload', () => {
        expect(getTagName(ctx)).toBe('v1.0.0')
    })

    test('gets the tag from the input', () => {
        process.env.INPUT_TAG_NAME = 'v2.1.1'
        expect(getTagName(ctx)).toBe('v2.1.1')
    })

    test('throws when no tag is available', () => {
        ctx = generateContext({ eventName: 'pizza' })
        expect(() => getTagName(ctx)).toThrow('No tag_name was found or provided!')
    })
})
