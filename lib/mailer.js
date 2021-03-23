const mailgun = require("mailgun-js");


class Mailer {
    constructor() {
        this.mg = mailgun({
            apiKey: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN,
            host: process.env.MAILGUN_HOST
        })
    }

    async sendGiftCardToContributor(contributorEmail, giftCardCode) {
        const data = {
            from: 'PostHog Team <hey@posthog.com>',
            to: contributorEmail,
            subject: "Thank you for your contribution to PostHog",
            text: `A code for you: ${giftCardCode}`
        };
        this.mg.messages().send(data, function (error, body) {
            console.log(error, body);
            if (error) {
                // alert yakko
            }
        });

    }
}

module.exports = {
    Mailer
}