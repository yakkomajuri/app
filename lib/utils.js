const fetch = require('node-fetch')

async function getEmailFromGithubUsername(username) {
    const userEventsRes = await fetch(`https://api.github.com/users/${username}/events/public`)
    const userEvents = await userEventsRes.json()

    const pushEvents = userEvents.filter((event) => event.type === 'PushEvent')

    let userEmail = ''

    for (const event of pushEvents) {
        if (!event.payload.commits) {
            continue
        }
        for (const commit of event.payload.commits) {
            if (commit.author.email && !commit.author.email.includes('noreply.github.com')) {
                userEmail = commit.author.email
                break
            }
        }
    }

    return userEmail
}

module.exports = {
    getEmailFromGithubUsername,
}
