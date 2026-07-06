import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'

export async function resolvePublishableFiles(workspace: string, entries: string[]): Promise<string[]> {
    const resolved = new Set<string>()

    for (const entry of entries) {
        const normalized = entry.replace(/\\/g, '/')
        const fullPath = path.join(workspace, normalized)

        if (!fs.existsSync(fullPath)) {
            core.warning(`Skipping missing path: ${normalized}`)
            continue
        }

        const stat = await fs.promises.stat(fullPath)
        if (stat.isFile()) {
            resolved.add(normalized)
            continue
        }

        if (stat.isDirectory()) {
            for (const filePath of await walkDirectory(workspace, normalized)) {
                resolved.add(filePath)
            }
        }
    }

    return [...resolved]
}

async function walkDirectory(workspace: string, dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.promises.readdir(path.join(workspace, dir), { withFileTypes: true })

    for (const entry of entries) {
        const relative = path.join(dir, entry.name).replace(/\\/g, '/')
        if (entry.isFile()) {
            files.push(relative)
        } else if (entry.isDirectory()) {
            files.push(...(await walkDirectory(workspace, relative)))
        }
    }

    return files
}
