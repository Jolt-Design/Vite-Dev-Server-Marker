import { rm, writeFile } from 'node:fs/promises'
import type { PluginOption } from 'vite'

const MARKER_FILE = '.jolt-marker.tmp'

export default function joltDevServerMarker(): PluginOption {
	let wroteFile = false

	return {
		name: 'jolt-dev-server-marker',
		async buildStart(): Promise<void> {
			if (this.environment.mode !== 'dev') {
				return
			}

			const content = {
				pid: process.pid,
				serverPort: this.environment.config.server.port,
			}

			await writeFile(MARKER_FILE, JSON.stringify(content))
			wroteFile = true
		},
		async buildEnd(): Promise<void> {
			if (wroteFile) {
				await rm(MARKER_FILE)
			}
		},
	}
}
