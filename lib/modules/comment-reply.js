/**
 * Queues all replies, and sends in one message
 */
class CommentReply {
    /**
     * @param {import('probot').Context}
     */
    constructor(context) {
        this.context = context
        this.message = ''
        this.sent = false
    }

    replyingToWho() {
        return this.context.payload.comment.user.login
    }

    replyingToWhere() {
        return this.context.payload.comment.html_url
    }

    reply(message) {
        this.message += `\n\n${message}`
    }

    async send() {
        if (this.sent) {
            throw new Error('Message already sent')
        }
        this.sent = true
        const fromUser = this.replyingToWho()
        const body = `@${fromUser} ${this.message}`
        this.context.log.debug(`Sending comment: ${body}`)
        const issueComment = this.context.issue({ body })
        return this.context.octokit.issues.createComment(issueComment)
    }
}

module.exports = CommentReply
