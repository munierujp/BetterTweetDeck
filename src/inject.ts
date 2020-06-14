import {isObject} from 'lodash';
import moduleRaid from 'moduleraid';

import {maybeAddColumnsButtons} from './features/addColumnButtons';
import {maybeAddTweetMenuItems} from './features/addTweetMenuItems';
import {allowImagePaste} from './features/allowImagePaste';
import {changeAvatarsShape} from './features/changeAvatarShape';
import {changeScrollbarStyling} from './features/changeScrollbars';
import {maybeSetupCustomTimestampFormat} from './features/changeTimestampFormat';
import {changeTweetActionsStyling} from './features/changeTweetActions';
import {maybeCollapseDms} from './features/collapseDms';
import {maybeFreezeGifsInProfilePicture} from './features/freezeGifsProfilePictures';
import {maybeHideColumnIcons} from './features/hideColumnIcons';
import {maybeRemoveRedirection} from './features/removeRedirection';
import {maybeRevertToLegacyReplies} from './features/revertToLegacyReplies';
import {maybeMakeComposerButtonsSmaller} from './features/smallerComposerButtons';
import {updateTabTitle} from './features/updateTabTitle';
import {maybeChangeUsernameFormat} from './features/usernameDisplay';
import {putBadgesOnTopOfAvatars} from './features/verifiedBadges';
import {listenToInternalBTDMessage, sendInternalBTDMessage} from './helpers/communicationHelpers';
import {setupChirpHandler} from './inject/chirpHandler';
import {setupMediaSizeMonitor} from './inject/columnMediaSizeMonitor';
import {maybeSetupDebugFunctions} from './inject/debugMethods';
import {BTDSettingsAttribute} from './types/betterTweetDeck/btdCommonTypes';
import {BTDMessageOriginsEnum, BTDMessages} from './types/betterTweetDeck/btdMessageTypes';
import {BTDSettings} from './types/betterTweetDeck/btdSettingsTypes';
import {TweetDeckObject} from './types/tweetdeckTypes';

// Declare typings on the window
declare global {
  interface Window {
    TD: unknown;
  }
}

let mR;
try {
  mR = moduleRaid();
} catch (e) {
  //
}

const TD = window.TD as TweetDeckObject;
// Grab TweetDeck's jQuery from webpack
const $: JQueryStatic | undefined =
  mR && mR.findFunction('jQuery') && mR.findFunction('jquery:')[0];

(async () => {
  if (!isObject(TD)) {
    return;
  }

  const settings = getBTDSettings();

  if (!settings || !$) {
    return;
  }

  setupChirpHandler(
    TD,
    (payload) => {
      putBadgesOnTopOfAvatars(settings, payload);
      sendInternalBTDMessage({
        name: BTDMessages.CHIRP_RESULT,
        origin: BTDMessageOriginsEnum.INJECT,
        isReponse: false,
        payload,
      });
    },
    (payload) => {
      sendInternalBTDMessage({
        name: BTDMessages.CHIRP_REMOVAL,
        origin: BTDMessageOriginsEnum.INJECT,
        isReponse: false,
        payload: {
          uuids: payload.uuidArray,
        },
      });
    }
  );

  markInjectScriptAsReady();
  setupMediaSizeMonitor({TD, $});
  maybeSetupDebugFunctions({$});
  maybeRemoveRedirection({TD});
  maybeChangeUsernameFormat({
    TD,
    settings,
  });
  maybeRevertToLegacyReplies({
    $,
    TD,
    settings,
  });
  allowImagePaste({$});
  maybeAddColumnsButtons({TD, $, settings});
  maybeAddTweetMenuItems({TD, $, settings});
  updateTabTitle({TD, $});
  changeAvatarsShape({settings});
  maybeMakeComposerButtonsSmaller({settings});
  maybeHideColumnIcons({settings});
  changeTweetActionsStyling({settings});
  changeScrollbarStyling({settings});
  maybeFreezeGifsInProfilePicture({settings});
  maybeCollapseDms({settings});

  $(document).one('dataColumnsLoaded', () => {
    document.body.classList.add('btd-loaded');
    maybeSetupCustomTimestampFormat({TD, settings});
    sendInternalBTDMessage({
      name: BTDMessages.BTD_READY,
      origin: BTDMessageOriginsEnum.INJECT,
      isReponse: false,
      payload: undefined,
    });
  });

  listenToInternalBTDMessage(
    BTDMessages.DOWNLOAD_GIF_RESULT,
    BTDMessageOriginsEnum.INJECT,
    (ev) => {
      const file = ev.data.payload;
      $(document).trigger('uiFilesAdded', {
        files: [file],
      });
      $('.btd-gif-button').removeClass('-visible');
    }
  );
  $(document).on('uiResetImageUpload', () => {
    $('.btd-gif-button').addClass('-visible');
  });
})();

/**
Helpers.
 */

/** Marks the DOM to make sure we don't inject our script twice. */
function markInjectScriptAsReady() {
  const {body} = document;
  if (!body) {
    return;
  }

  body.setAttribute('data-btd-ready', 'true');
}

/** Parses and returns the settings from the <script> tag as an object. */
function getBTDSettings() {
  const scriptElement = document.querySelector(`[${BTDSettingsAttribute}]`);
  const settingsAttribute = scriptElement && scriptElement.getAttribute(BTDSettingsAttribute);

  try {
    const raw = settingsAttribute && JSON.parse(settingsAttribute);
    return raw as BTDSettings;
  } catch (e) {
    return undefined;
  }
}
