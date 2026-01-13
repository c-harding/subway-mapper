# subway-mapper

A project for creating subway maps in SVG, implemented in Vue 3.

## Plan

- [x] Define data model for subway networks
- [x] Render single lines as HTML lists
- [x] Render single lines as SVG
- [x] Render line number symbols as SVG
- [ ] Render line number symbols in SVG map
  - [ ] Positioning: new line below station label, or right of station label?
  - [ ] Determine the ideal height for the line number symbol based on the font size of the station label
- [ ] Support optimal spacing of station labels, rather than as dense as possible
  - [ ] Algorithm:
    - [ ] Determine spacing options for line (different layouts, different hyphenations), with weights based on hyphenation and number of side switches
      - [x] Support hyphenation options per station label
      - [ ] Prune options
      - [ ] Allow wrapping even when not necessary for space reasons, to improve layout
      - [ ] Favour layouts without hyphenation
    - [x] Take into account future layout curves: does the next line segment curve left or right?
    - [x] Determine minimum length
  - [x] Initially, allow the user to specify a target length for the line
  - [ ] Later, optimize for overall map layout
- [x] Support diagonals in line segments
- [ ] Support different angles per line segment
  - [ ] Consider how to represent in data model, particularly with support for multiple lines sharing segments
    - [ ] Ideally keep this independent of the base line information
    - [ ] One file for line information, one file for layout information
    - [ ] Move font information to layout file?
  - [ ] Consider how to perform two corners between segments
  - [ ] Consider how to add station labels at corners
- [ ] Support parallel lines
  - [ ] Consider how to represent in data model
  - [ ] Consider how to layout parallel lines with different angles
  - [ ] Station markers for parallel lines
  - [ ] Corners with shared radius for parallel lines
- [ ] Support branching lines
- [ ] Support loops
- [ ] Support line segments with custom properties
  - [ ] Different style, e.g. under construction, limited service, etc.
- [ ] Support stations with custom properties per line
  - [ ] E.g. limited service
- [ ] Support perpendicular transfer lines


## Networks

The following subway networks are currently supported:

### München Verkehrs- und Tarifverbund (MVV)

#### Fonts used

- General font: [Asap](https://fonts.google.com/specimen/Asap) (also for regional train numbers)
- S-Bahn numbers: [Helvetica](https://www.fonts.com/font/linotype/helvetica). Free alternative: [Inter](https://fonts.google.com/specimen/Inter)
- U-Bahn numbers: [Frutiger](https://www.fonts.com/font/linotype/frutiger). Free alternative: [Hind](https://fonts.google.com/specimen/Hind)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
yarn
```

### Compile and Hot-Reload for Development

```sh
yarn dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn build
```

### Lint with [ESLint](https://eslint.org/)

```sh
yarn lint
```
