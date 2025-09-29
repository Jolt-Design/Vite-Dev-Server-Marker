import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import type { PluginOption } from 'vite'

const MARKER_FILE = '.jolt-marker.tmp'
const EXIT_SIGNALS = [
	'SIGABRT',
	'SIGBUS',
	'SIGFPE',
	'SIGHUP',
	'SIGILL',
	'SIGINT',
	'SIGQUIT',
	'SIGSEGV',
	'SIGTERM',
	'SIGTRAP',
	'SIGUSR1',
	'SIGUSR2',
]

export default function joltDevServerMarker(): PluginOption {
	let wroteFile = false
	let cleanupRegistered = false
	let isDevServer = false

	const cleanUpFile = () => {
		if (wroteFile) {
			rmSync(MARKER_FILE)
			wroteFile = false
		}
	}

	return {
		name: 'jolt-dev-server-marker',
		configResolved(config) {
			isDevServer = config.command === 'serve'
		},
		async buildStart(): Promise<void> {
			if (!isDevServer) {
				return
			}

			const content = {
				pid: process.pid,
				serverPort: isDevServer
					? this.environment?.config?.server?.port || null
					: null,
			}

			await writeFile(MARKER_FILE, JSON.stringify(content))
			wroteFile = true

			if (!cleanupRegistered) {
				process.on('exit', cleanUpFile)

				for (const signal of EXIT_SIGNALS) {
					process.on(signal, () => process.exit())
				}

				cleanupRegistered = true
			}
		},
		async buildEnd(): Promise<void> {
			cleanUpFile()
		},
	}
}
