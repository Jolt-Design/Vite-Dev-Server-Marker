import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import type { PluginOption } from 'vite'

interface MarkerFileContent {
	pid: number
	serverPort: number | null
	createdTime: string
	lastUpdated: string
}

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
	let recreateInterval: NodeJS.Timeout | null = null
	let createdTime: string | null = null

	const cleanUpFile = () => {
		if (wroteFile) {
			rmSync(MARKER_FILE)
			wroteFile = false
		}

		if (recreateInterval) {
			clearInterval(recreateInterval)
			recreateInterval = null
		}
	}

	const isProbablyPingOperation = () => {
		// Check for explicit esbuild ping environment variable
		if (process.env.ESBUILD_PING === 'true') {
			return true
		}

		// Check if we're in a test context (Vitest, Jest, etc.)
		if (
			process.env.VITEST === 'true' ||
			process.env.NODE_ENV === 'test' ||
			process.env.JEST_WORKER_ID !== undefined
		) {
			return true
		}

		// Check for VS Code extension context
		if (
			process.env.VSCODE_PID !== undefined ||
			process.env.VSCODE_AMD_ENTRYPOINT !== undefined
		) {
			return true
		}

		// Check if the parent process suggests this is a tooling operation
		try {
			const ppid = process.ppid
			if (
				ppid &&
				process.env._ &&
				(process.env._.includes('vitest') ||
					process.env._.includes('jest') ||
					process.env._.includes('esbuild'))
			) {
				return true
			}
		} catch {
			// Ignore errors accessing process info
		}

		return false
	}

	return {
		name: 'jolt-dev-server-marker',
		configResolved(config) {
			isDevServer = config.command === 'serve'
		},
		async buildStart(): Promise<void> {
			if (!isDevServer || isProbablyPingOperation()) {
				return
			}

			// Record the initial created time
			createdTime = new Date().toISOString()

			const writeMarkerFile = async () => {
				const content: MarkerFileContent = {
					pid: process.pid,
					serverPort: isDevServer
						? this.environment?.config?.server?.port || null
						: null,
					createdTime: createdTime ?? '',
					lastUpdated: new Date().toISOString(),
				}

				await writeFile(MARKER_FILE, JSON.stringify(content))
				wroteFile = true
			}

			// Write initial marker file
			await writeMarkerFile()

			// Set up interval to recreate marker file every minute (60000ms)
			recreateInterval = setInterval(async () => {
				try {
					await writeMarkerFile()
				} catch (error) {
					console.error('Failed to recreate marker file:', error)
				}
			}, 60000)

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
