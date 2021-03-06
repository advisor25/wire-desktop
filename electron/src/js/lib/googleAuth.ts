/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {BrowserWindow} from 'electron';
import * as google from 'googleapis';
import * as qs from 'querystring';
import * as request from 'request';

import {GoogleAccessTokenResult} from '../../interfaces/';

const OAuth2 = google.auth.OAuth2;

const authorizeApp = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      title: '',
      useContentSize: true,
    });

    win.setMenuBarVisibility(false);
    win.loadURL(url);

    win.on('closed', () => reject(new Error('User closed the window')));

    win.on('page-title-updated', () => {
      setImmediate(() => {
        const title = win.getTitle();

        const [, , returnValue] = title.split(/[ =]/);
        if (title.startsWith('Denied')) {
          reject(new Error(returnValue));
          win.removeAllListeners('closed');
          win.close();
        } else if (title.startsWith('Success')) {
          resolve(returnValue);
          win.removeAllListeners('closed');
          win.close();
        }
      });
    });
  });
};

const getAccessToken = (scopes: string, clientId: string, clientSecret: string): Promise<GoogleAccessTokenResult> => {
  return getAuthorizationCode(scopes, clientId, clientSecret).then(code => {
    return new Promise<GoogleAccessTokenResult>((resolve, reject) => {
      const data = qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      });

      const requestConfig = {
        body: data,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      const requestUrl = 'https://accounts.google.com/o/oauth2/token';

      request.post(requestUrl, requestConfig, (error, response, body) => {
        if (error) {
          return reject(error);
        }

        const result = JSON.parse(body) as GoogleAccessTokenResult;
        return resolve(result);
      });
    });
  });
};

const getAuthenticationUrl = (scopes: string, clientId: string, clientSecret: string) => {
  const oauth2Client = new OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  return oauth2Client.generateAuthUrl({scope: scopes});
};

const getAuthorizationCode = (scopes: string, clientId: string, clientSecret: string): Promise<string> => {
  const url = getAuthenticationUrl(scopes, clientId, clientSecret);
  return authorizeApp(url);
};

export {getAccessToken};
