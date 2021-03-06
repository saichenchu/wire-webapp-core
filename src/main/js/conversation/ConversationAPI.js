/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

const Logdown = require('logdown');
const popsicle = require('popsicle');
const status = require('popsicle-status');

/**
 * @constructor
 * @param {User} user
 */
function ConversationAPI(user) {
  this.user = user;
  this.logger = new Logdown({prefix: 'wire.core.conversation.ConversationAPI', alignOutput: true});
}

// TODO: Move to CryptoHelper!
ConversationAPI.prototype.createPayLoadMap = (payloads) => {
  const recipients = {};

  if (payloads) {
    payloads.forEach((payload) => {
      const sessionId = payload.sessionId;
      const encrypted = payload.encryptedPayload;

      const parts = sessionId.split('@');
      const userId = parts[0];
      const clientId = parts[1];

      if (recipients[userId] === undefined) {
        recipients[userId] = {};
      }

      recipients[userId][clientId] = encrypted;
    });
  }

  return recipients;
};

ConversationAPI.prototype.getPreKeys = function(userClientMap) {
  let self = this;

  return popsicle.request({
    method: 'POST',
    url: `${self.user.backendURL}/users/prekeys`,
    body: userClientMap,
    headers: {
      'Authorization': `Bearer ${decodeURIComponent(self.user.accessToken)}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  }).use([status(), popsicle.plugins.parse('json')]);
};

ConversationAPI.prototype.sendMessage = function(conversationId, payloads) {
  const payloadMap = this.createPayLoadMap(payloads);
  const hasContent = !!(Object.keys(payloadMap).length);
  let self = this;

  let suffix = 'ignore_missing=false';
  if (hasContent) {
    suffix = 'ignore_missing=true';
  }

  return popsicle.request({
    method: 'POST',
    url: `${self.user.backendURL}/conversations/${conversationId}/otr/messages?${suffix}`,
    body: {
      sender: self.user.client.id,
      recipients: payloadMap,
    },
    headers: {
      'Authorization': `Bearer ${decodeURIComponent(self.user.accessToken)}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  }).use([popsicle.plugins.parse('json')]);
};

module.exports = ConversationAPI;
