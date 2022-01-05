import './contentWarnings.css';

import {onChirpAdded} from '../services/chirpHandler';
import {makeBTDModule, makeBtdUuidSelector} from '../types/btdCommonTypes';
import {TwitterActionEnum} from '../types/tweetdeckTypes';
import {extractContentWarnings} from './contentWarningsHelpers';

const contentWarningsIgnoreList = [
  TwitterActionEnum.FAVORITE,
  TwitterActionEnum.FAVORITED_MEDIA,
  TwitterActionEnum.FAVORITED_MENTION,
  TwitterActionEnum.FAVORITED_RETWEET,
  TwitterActionEnum.RETWEETED_MEDIA,
  TwitterActionEnum.RETWEETED_MENTION,
  TwitterActionEnum.RETWEETED_RETWEET,
  TwitterActionEnum.RETWEET,
];

export const contentWarnings = makeBTDModule(({TD, settings}) => {
  if (!settings.detectContentWarnings) {
    return;
  }

  onChirpAdded((payload) => {
    const chirpNode = document.querySelector(makeBtdUuidSelector('data-btd-uuid', payload.uuid));

    if (!chirpNode) {
      return;
    }

    if (chirpNode.querySelectorAll('.btd-content-warning, .tweet-detail').length > 0) {
      return;
    }

    // if (
    //   payload.chirpExtra.action &&
    //   contentWarningsIgnoreList.includes(payload.chirpExtra.action)
    // ) {
    //   return;
    // }

    const isNotificationAboutTweet =
      payload.chirpExtra.action && contentWarningsIgnoreList.includes(payload.chirpExtra.action);
    const textToMatchAgainst =
      isNotificationAboutTweet && payload.chirp.targetTweet
        ? payload.chirp.targetTweet.text
        : payload.chirp.text;
    const htmlTextToMatchAgainst =
      isNotificationAboutTweet && payload.chirp.targetTweet
        ? payload.chirp.targetTweet.htmlText
        : payload.chirp.htmlText;

    const matches = extractContentWarnings(textToMatchAgainst);

    if (!matches) {
      return;
    }

    const warningBlock = matches.block;
    const warningSubject = matches.subject;
    const warningText = matches.text;

    if (!warningSubject || !warningText) {
      return;
    }

    const details = document.createElement('details');
    details.classList.add('btd-content-warning', 'is-actionable');

    const summary = document.createElement('summary');
    summary.innerHTML = TD.util.transform(warningBlock);

    // Stopping event propagation because everything inside tweets opens the detail view
    summary.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    details.appendChild(summary);

    const tweetText = document.createElement('p');
    tweetText.classList.add('tweet-text', 'js-tweet-text', 'with-linebreaks');
    tweetText.innerHTML = htmlTextToMatchAgainst
      .replace(TD.util.escape(warningBlock), '')
      .replace(/^\n/, '');
    details.appendChild(tweetText);
    details.addEventListener('toggle', () => {
      if (details.open) details.closest('.js-tweet')?.classList.add('cw-open');
      else {
        details.closest('.js-tweet')?.classList.remove('cw-open');
      }
    });

    chirpNode.querySelector('.tweet-text')?.replaceWith(details);
    details.closest('.js-tweet')?.classList.add('cw');
  });
});
