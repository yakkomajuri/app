const { Pool } = require('pg')

class Database {

    constructor(postgresPool) {
        this.pool = postgresPool
    }

    async handleNewContribution(username) {
        const res = await this.pool.query('SELECT * FROM contributors')
        await this.pool.end()
        console.log(res)
    }

    async #addNewContributor(username) {

    }

    async #updateContributorLevel(username) {

    }

}

module.exports = {
    Database
}