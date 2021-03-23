const PostHog = require('posthog-node')
const { Mailer } = require('./mailer')



const posthog = new PostHog(process.env.PH_PROJECT_API_KEY)
const mailer = new Mailer()

const parseComment = require("./parse-comment");
const toSafeGitReferenceName = require("./to-safe-git-reference-name");
const setupRepository = require("./setup-repository");
const getConfig = require("./get-config");
const addContributor = require("./add-contributor");
const P = require('pino');

async function processIssueComment({ context, commentReply, db }) {
  const commentBody = context.payload.comment.body;
  const repo = context.payload.repository;
  const createdBy = context.payload.comment.user;
  const { who, action, contributions } = parseComment(commentBody);

  const log = context.log.child({
    who,
    action,
    contributions,
    account: repo.owner.id,
    accountType: repo.owner.type.toLowerCase(),
    accountLogin: repo.owner.login,
    createdBy: createdBy.id,
    createdByLogin: createdBy.login,
    createdByType: createdBy.type.toLowerCase(),
    repository: repo.id,
    private: repo.private,
    success: false,
  });

  if (action !== "add") {
    log.info(`Unknown action "${action}"`);
    commentReply.reply(`I could not determine your intention.`);
    commentReply.reply(
      `Basic usage: @all-contributors please add @someone for code, doc and infra`
    );
    commentReply.reply(
      `For other usages see the [documentation](https://allcontributors.org/docs/en/bot/usage)`
    );
    return;
  }

  if (contributions.length === 0) {
    log.info("No contributions");
    commentReply.reply(
      `I couldn't determine any contributions to add, did you specify any contributions?
          Please make sure to use [valid contribution names](https://allcontributors.org/docs/en/emoji-key).`
    );
    return;
  }

  await processContribution({
    who,
    contributions,
    log,
    context: context,
    commentReply: commentReply,
    db: db
  })

}

async function processContribution({
  who,
  contributions,
  log,
  context,
  commentReply = '',
  db,
  pullRequestUrl
}) {



  const branchName = `all-contributors/add-${toSafeGitReferenceName(who)}`;


  // set up repository instance. Uses branch if it exists, falls back to repository's default branch
  const repository = await setupRepository({ context, branchName });


  // loads configuration from repository. Initializes config if file does not exist
  const config = await getConfig(repository);


  repository.setSkipCi(config.options.skipCi);

  const isCodeContribution = contributions.includes("code")

  let contributorUpdateQueryRes = null

  let merchNotificationDetails = {}

  if (isCodeContribution) {
    contributorUpdateQueryRes = await db.handleNewContribution(who)

    merchNotificationDetails = {
      success: false,
      email: ''
    }

    if (contributorUpdateQueryRes.querySucceeded) {
      const giftCardCode = await db.getGiftCardCode(who, contributorUpdateQueryRes.contributorLevel)

      if (giftCardCode) {

        console.log(`SENDING EMAIL TO ${who} with gift card code ${giftCardCode}`)
        const emailSucceeded = mailer.sendGiftCardToContributor('yakko@posthog.com', giftCardCode)
        if (emailSucceeded) {
          merchNotificationDetails.success = true
          merchNotificationDetails.email = 'yakko@posthog.com'
        }
      } else {
        // notify yakko of missing cards
      }

    }
  }


  const { pullCreated, user } = await addContributor({
    context,
    commentReply,
    repository,
    config,
    who,
    contributions,
    branchName,
    pullRequestUrl,
    merchNotificationDetails
  });

  const userProps = 
    contributorUpdateQueryRes && contributorUpdateQueryRes.querySucceeded ?
    { contributor_level: contributorUpdateQueryRes.contributorLevel } :
    { }

  posthog.capture({
    distinctId: `gh_user_${who}`,
    event: 'new_contribution',
    properties: {
      $set: userProps,
      $set_once: {
        email: 'bla'
      },
      is_code_contribution: isCodeContribution,
      contributions: contributions.join(','),
      gh_username: who
    }
  })

  if(!pullCreated) {
    log.info(
        {
          pullCreated,
          success: true,
        },
        `${who} already have ${contributions.join(", ")}`
    );
    return;
  }

  log.info(
    {
      pullCreated,
      success: true,
      createdFor: user.id,
      createdForType: "user",
      createdForLogin: user.login.toLowerCase(),
    },
    `${who} added for ${contributions.join(", ")}`
  );
}

module.exports = { processIssueComment, processContribution }
