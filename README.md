# My homepage

It's small, but honest work

## Resume data

Resume data is loaded from the GitHub API, then the raw GitHub URL, with the `resume-source` Git submodule as a local fallback.

Clone with `git clone --recurse-submodules`, or run `git submodule update --init --recursive` in an existing clone. To update the fallback data, run `git submodule update --remote resume-source` and commit the updated submodule reference.

## License

The Windows XP name, artwork, trademark are surely property of Microsoft.
It is not affiliated with and has not been approved by Microsoft.

## Resume themes

The resume is generated with [Pro](https://www.npmjs.com/package/jsonresume-theme-pro), licensed under MIT. Pro includes Source Serif 4 under the [SIL Open Font License 1.1](https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md). Themes, PDF libraries and fonts are loaded from pinned CDN URLs.

[Even](https://github.com/rbardini/jsonresume-theme-even) by Rafael Bardini is also included as an alternative renderer, licensed under MIT.
