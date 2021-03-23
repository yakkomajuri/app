const { Pool } = require('pg')
const PostHog = require('posthog-node')

const posthog = new PostHog(process.env.PH_PROJECT_API_KEY)

class Database {

    constructor(postgresPool) {
        this.pool = postgresPool
    }

    async handleNewContribution(username) {
        const contributorExists = (await this.pool.query(`SELECT (username) FROM contributors WHERE username='${username}'`)).rows.length
        if (contributorExists) {
            this.#updateContributorLevel(username)
        } else {
            this.#addNewContributor(username)
        }
    }

    async #addNewContributor(username) {
        
    }

    async #updateContributorLevel(username) {

    }

}

module.exports = {
    Database
}