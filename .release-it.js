module.exports = {
    hooks: {
        // Update changelog and add to publish commit
        'after:bump': 'npm run build && npm run changelog',
        'after:release': 'echo Successfully released ${name} v${version} to ${repo.repository}.',
    },
    git: {
        changelog:
            'npx auto-changelog -p --commit-limit false --stdout --unreleased --template tpl-release-changes.hbs --starting-commit 7fe03008f2c6f39f3475808cf6416da008d32fc2',
        commitMessage: 'chore(release): Publish v${version}',
        requireUpstream: false,
        tagName: 'v${version}',
    },
    github: {
        release: true,
        releaseName: '${version}',
    },
    npm: false,
};
