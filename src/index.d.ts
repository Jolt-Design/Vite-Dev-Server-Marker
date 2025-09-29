import { type PluginOption } from 'vite'

export interface MarkerFileContent {
	pid: number
	serverPort: number | null
	createdTime: string
	lastUpdated: string
}

export default function joltDevServerMarker(): PluginOption
