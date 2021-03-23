class Database {

    constructor(postgresPool) {
        this.pool = postgresPool
    }

    async handleNewContribution(username) {
        const contributorExists = (await this.pool.query(`SELECT (username) FROM contributors WHERE username='${username}'`)).rows.length

        let res = { querySucceeded: false, contributorLevel: 1 }
        if (contributorExists) {
            res.querySucceeded = !!(await this.#updateContributorLevel(username))
        } else {
            res.querySucceeded = !!(await this.#addNewContributor(username))
            if (res.querySucceeded) {
                res.contributorLevel = await this.#getContributorLevel(username)
            }
        }

        return res 
    }

    async #addNewContributor(username) {
        const addNewContributorRes = await this.pool.query(`
            INSERT INTO contributors
            (username, level) 
            VALUES ('${username}', 1);
        `)
    
        return !!addNewContributorRes.rowCount
    }

    async #updateContributorLevel(username) {
        const updateContributorRes = await this.pool.query(`
            UPDATE contributors
            SET level = level + 1
            WHERE username='${username}';
    `)

        return !!updateContributorRes.rowCount
    }

    async #getContributorLevel(username) {
        const contributorLevelRes = await this.pool.query(`
            SELECT level FROM contributors
            WHERE username='${username}'
            LIMIT 1;
        `)

        return contributorLevelRes.rows[0].level
    }

    async getGiftCardCode(username, contributorLevel) {

        const giftCardTokenRes = await this.pool.query(`
            SELECT token FROM gift_cards 
            WHERE level=${contributorLevel > 3 ? 3 : contributorLevel}
            AND has_been_used=false
            LIMIT 1;
        `)

        if (giftCardTokenRes.rowCount === 0) {
            // alert yakko that gift cards are missing
            return
        }

        const token = giftCardTokenRes.rows[0].token


        await this.pool.query(`
            UPDATE gift_cards
            SET has_been_used=True,
            username='${username}',
            used_at=NOW()
            WHERE token='${token}';
        `)

        return token

    }

}

/*


# Insert gift card

INSERT INTO gift_cards 
(token, value, level, has_been_used) 
VALUES 
('token1', 35, 1, false),
('token2', 35, 2, false),
('token3', 35, 3, false);

# Pull a gift card to use

SELECT token FROM gift_cards 
WHERE level=1 
AND value=35 
AND has_been_used=false
LIMIT 1;

# Update gift card after use

UPDATE gift_cards
SET has_been_used=True,
username='hello',
used_at=NOW()
WHERE token='abcdefgh';

# Add contributor

INSERT INTO contributors
(username, level) 
VALUES ('hello', 1);

# Increment contributions

UPDATE contributors
SET level = level + 1
WHERE username='hello';


# Get contributor level

SELECT level FROM contributors
WHERE username='hello'
LIMIT 1;

*/

module.exports = {
    Database
}

