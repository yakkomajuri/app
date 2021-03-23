const isMessageByApp = require("./lib/is-message-by-app");
const isMessageForApp = require("./lib/is-message-for-app");
const CommentReply = require("./lib/modules/comment-reply");
const { processIssueComment, processContribution } = require("./lib/process-issue-comment");
const { AllContributorBotError } = require("./lib/modules/errors");
const { OrganizationMembers } = require("./lib/organization-members");
const { Database } = require("./lib/database");
const probot = require('probot')


const organizationMembers = new OrganizationMembers()
const db = new Database()




/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on("issue_comment.created", async (context) => {
    if (isMessageByApp(context)) return;
    if (!isMessageForApp(context)) return;

    // process comment and reply
    const commentReply = new CommentReply(context);
    try {
      await processIssueComment({ context, commentReply });
    } catch (error) {
      const isKnownError = error instanceof AllContributorBotError;
      if (!isKnownError) {
        commentReply.reply(
          `We had trouble processing your request. Please try again later.`
        );

        throw error;
      }

      context.log.info({ isKnownError, error: error.name }, error.message);
      commentReply.reply(error.message);
    } finally {
      await commentReply.send();
    }

    await db.handleNewContribution('')

  });

  app.on("pull_request.closed", async (context) => {
    const pullRequest = context.payload.pull_request
    const members = await organizationMembers.getOrganizationMembers()
    const who = pullRequest.user.login

    if (!pullRequest.merged || members.has(who)) {
      return
    }


    const log = context.log.child({
      who,
      action: "add",
      contributions: ["code"]
    });

    try {
      await processContribution({
        who,
        log,
        contributions: ["code"],
        context: context 
      })
    } catch (error) {
      const isKnownError = error instanceof AllContributorBotError;
      context.log.info({ isKnownError, error: error.name }, error.message);
    }

  })

  app.on(
    ["installation", "installation_repositories"],
    async ({ name, payload, log }) => {
      const {
        action,
        repositories,
        repositories_added,
        repositories_removed,
        installation,
      } = payload;

      const repositoriesChange =
        action === "created"
          ? repositories.length
          : action === "deleted"
          ? -repositories.length
          : repositories_added
          ? repositories_added.length - repositories_removed.length
          : 0;

      const meta = {
        event: name,
        action,
        account: installation.account.id,
        accountType: installation.account.type.toLowerCase(),
        accountLogin: installation.account.login,
        installation: installation.id,
        selection: installation.repository_selection,
        repositoriesChange,
      };
      log.info(meta, `${meta.accountLogin}: ${name} ${action}`);
    }
  );

  app.onAny((a) => {
    console.log(a)
  })
};

