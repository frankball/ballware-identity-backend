/**
 * @license
 * Copyright 2021 Frank Ballmeyer
 * This code is released under the MIT license.
 * SPDX-License-Identifier: MIT
 */

import { Session, SessionWithUserInfo, ResourceOwnerAuthApi } from '@ballware/identity-interface';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface UserInfoResponse extends Record<string, unknown> {
  sub: string;
  preferred_username: string;
}

const loginFunc = (serviceBaseUrl: string, scopes: string) => <T extends SessionWithUserInfo>(
  email: string,
  password: string,
  client: string,
  secret: string,
  userinfoMapper: (sessionWithUserInfo: T, userinfo: Record<string, unknown>) => T,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const tokenUrl = `${serviceBaseUrl}connect/token`;
    const userinfoUrl = `${serviceBaseUrl}connect/userinfo`;

    axios
      .post<TokenResponse>(
        tokenUrl,
        `grant_type=password&client_id=${encodeURIComponent(client)}&client_secret=${encodeURIComponent(
          secret,
        )}&scope=${encodeURIComponent(scopes)}&username=${encodeURIComponent(email)}&password=${encodeURIComponent(
          password,
        )}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      )
      .then((tokenResponse) => {
        axios
          .get<UserInfoResponse>(userinfoUrl, {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
          })
          .then((userinfoResponse) => {
            let session = {
              access_token: tokenResponse.data.access_token,
              refresh_token: tokenResponse.data.refresh_token,
              expires_in: tokenResponse.data.expires_in,
              identifier: userinfoResponse.data.sub,
              email: userinfoResponse.data.preferred_username,
            } as T;

            if (userinfoMapper) {
              session = userinfoMapper(session, userinfoResponse.data);
            }

            resolve(session);
          })
          .catch((reason) => reject(reason));
      })
      .catch((reason) => reject(reason));
  });
};

const logoutFunc = (serviceBaseUrl: string) => (accessToken: string, client: string, secret: string): Promise<void> => {
  const url = `${serviceBaseUrl}connect/revocation`;

  return axios.post(
    url,
    `client_id=${encodeURIComponent(client)}&client_secret=${encodeURIComponent(
      secret,
    )}&token_type_hint=access_token&token=${encodeURIComponent(accessToken)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
};

const registerFunc = (serviceBaseUrl: string) => (
  email: string,
  password: string,
  displayname: string,
): Promise<void> => {
  const url = `${serviceBaseUrl}api/public/register`;

  return axios.post(url, JSON.stringify({ email, displayname, password }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const forgotPasswordFunc = (serviceBaseUrl: string) => (email: string): Promise<void> => {
  const url = `${serviceBaseUrl}api/public/forgotpassword`;

  return axios.post(url, JSON.stringify({ Email: email }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const resetPasswordFunc = (serviceBaseUrl: string) => (
  email: string,
  code: string,
  newPassword: string,
): Promise<void> => {
  const url = `${serviceBaseUrl}api/public/resetpassword`;

  return axios.post(url, JSON.stringify({ Email: email, Code: code, Password: newPassword }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const changePasswordFunc = (serviceBaseUrl: string) => (
  accessToken: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  const url = `${serviceBaseUrl}api/public/changepassword`;

  return axios.post(url, JSON.stringify({ OldPassword: oldPassword, NewPassword: newPassword }), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
};

const refreshTokenFunc = (serviceBaseUrl: string) => (
  refreshToken: string,
  client: string,
  secret: string,
): Promise<Session> => {
  return new Promise((resolve, reject) => {
    const tokenUrl = `${serviceBaseUrl}connect/token`;

    axios
      .post<TokenResponse>(
        tokenUrl,
        `grant_type=refresh_token&client_id=${client}&client_secret=${secret}&refresh_token=${encodeURIComponent(
          refreshToken,
        )}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      )
      .then((tokenResponse) => {
        const session = {
          access_token: tokenResponse.data.access_token,
          refresh_token: tokenResponse.data.refresh_token,
          expires_in: tokenResponse.data.expires_in,
        } as Session;

        resolve(session);
      })
      .catch((reason) => reject(reason));
  });
};

/**
 * Create API adapter for ballware.identity.server with resource owner auth flow
 * @param serviceBaseUrl Base URL of identity provider to use
 * @param scopes Collection of requested scopes
 */
export function createResourceOwnerAuthApi(serviceBaseUrl: string, scopes: string): ResourceOwnerAuthApi {
  return {
    login: loginFunc(serviceBaseUrl, scopes),
    logout: logoutFunc(serviceBaseUrl),
    register: registerFunc(serviceBaseUrl),
    forgotPassword: forgotPasswordFunc(serviceBaseUrl),
    resetPassword: resetPasswordFunc(serviceBaseUrl),
    changePassword: changePasswordFunc(serviceBaseUrl),
    refreshToken: refreshTokenFunc(serviceBaseUrl),
  } as ResourceOwnerAuthApi;
}
