# Contributing

## Getting started

Make sure you have the desired version of [NodeJS](https://nodejs.org) installed. It should be compatible with the version specified in our [version file](../.nvmrc).

After cloning the repo, run the following to install dependencies:

```sh
npm install
```

## Running tests

Unit tests can be run using `npm test` (or `npm t`).

## Releases

Currently releases are done locally via the CLI. We use [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) to handle version bumping and changelog generation.

Some helpful commands:

- `npx commit-and-tag-version --dry-run`: perform a dry-run release. If you're trying to figure out the desired options for performing a release, it's generally a good idea to specify this `--dry-run` flag for any command you do.

- `npx commit-and-tag-version`: create a release. This will bump the version and update the changelog file. At the end of the command's output it will tell you the command to run to actually push the changes and publish the release to npm. Usually it's something like:

  ```sh
  Run `git push --follow-tags origin main` to publish
  ```
