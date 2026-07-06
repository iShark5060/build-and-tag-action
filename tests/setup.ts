import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const releaseFixture = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'release.json'), 'utf8')
)

const eventPath = path.join(os.tmpdir(), `build-and-tag-event-${process.pid}.json`)
fs.writeFileSync(eventPath, JSON.stringify(releaseFixture))

Object.assign(process.env, {
    GITHUB_ACTION: 'my-action',
    GITHUB_ACTOR: 'JasonEtco',
    GITHUB_EVENT_NAME: 'release',
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REF: 'master',
    GITHUB_REPOSITORY: 'JasonEtco/test',
    GITHUB_SHA: '123abc',
    GITHUB_TOKEN: '456def',
    GITHUB_WORKFLOW: 'my-workflow',
    GITHUB_WORKSPACE: path.join(__dirname, 'fixtures', 'workspace'),
    HOME: '?',
    INPUT_TAG_NAME: ''
})

export function resetReleaseFixture() {
    fs.writeFileSync(eventPath, JSON.stringify(structuredClone(releaseFixture)))
}

resetReleaseFixture()
