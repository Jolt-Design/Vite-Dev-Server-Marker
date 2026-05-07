# Vite Dev Server Marker

A simple [Vite](https://vite.dev/) plugin that creates a file called `.jolt-marker.tmp` when the Vite dev server is running.

## Why?

This allows external software to detect that the dev server is operational and include the hot module reload code instead of the production code.

This is used by [Jolt Vite WP](https://github.com/Jolt-Design/Vite-WP).
