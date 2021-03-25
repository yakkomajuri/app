const fetch = require('node-fetch')

async function getEmailFromGithubUsername(username) {
    const userEventsRes = await fetch(`https://api.github.com/users/${username}/events/public`)
    const userEvents = await userEventsRes.json()
    let userEmail = ''


    if (!userEvents || userEvents.length === 0) {
        return userEmail
    }
    const pushEvents = userEvents.filter((event) => event.type === 'PushEvent')


    for (const event of pushEvents) {
        if (!event.payload.commits) {
            continue
        }
        for (const commit of event.payload.commits) {
            if (commit.author.email && !commit.author.email.includes('noreply.github.com') && commit.url) {
                const commitRes = await fetch(commit.url)
                const commitJson = await commitRes.json()
                if (commitJson.author.login === username) {
                    userEmail = commit.author.email
                    break
                }
            }
        }
    }

    return userEmail
}

function pullRequestContainsLabel(pr, targetLabel) {
    return pr.labels.filter(label => label.name === targetLabel).length > 0
}

module.exports = {
    getEmailFromGithubUsername,
    pullRequestContainsLabel
}
