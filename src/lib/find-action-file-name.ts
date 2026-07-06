import { existsSync } from 'fs'
import path from 'path'

export default function findActionFileName(baseDir: string): string {
    if (existsSync(path.join(baseDir, 'action.yml'))) {
        return 'action.yml'
    }

    if (existsSync(path.join(baseDir, 'action.yaml'))) {
        return 'action.yaml'
    }

    throw new Error('No action file found. Please create an action.yml or action.yaml file.')
}
