# Acdence

An academic workspace for keeping courses, scores, deadlines, and term progress in sync.

## Development

Install the project dependencies and start the development server:

```sh
vp install
vp dev
```

Vite+ provides the runtime, package, development, test, lint, format, and build commands through `vp`.

```sh
vp check    # format, lint, and type-check
vp test     # run the Vitest suite
vp build    # create a production build
vp preview  # preview the production build
```

The project uses Vite 8.3, Vitest 4.1, Oxlint, and Oxfmt through the local Vite+ toolchain. See the [Vite+ guide](https://viteplus.dev/guide/) for command and configuration details.
