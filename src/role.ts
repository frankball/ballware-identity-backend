/**
 * @license
 * Copyright 2021 Frank Ballmeyer
 * This code is released under the MIT license.
 * SPDX-License-Identifier: MIT
 */

import { IdentityRoleApi } from '@ballware/identity-interface';
import axios from 'axios';

const selectListFunc = (serviceBaseUrl: string) => (token: string): Promise<Array<Record<string, unknown>>> => {
  const url = `${serviceBaseUrl}api/role/selectlist`;

  return axios
    .get<Array<Record<string, unknown>>>(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => response.data);
};

const selectByIdFunc = (serviceBaseUrl: string) => (
  token: string,
  identifier: string,
): Promise<Record<string, unknown>> => {
  const url = `${serviceBaseUrl}api/role/selectbyid/${identifier}`;

  return axios
    .get<Record<string, unknown>>(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => response.data);
};

/**
 * Create API adapter for ballware.identity.server role list access
 * @param serviceBaseUrl Base url for ballware.identity.server to use
 */
export function createIdentityBackendRoleApi(serviceBaseUrl: string): IdentityRoleApi {
  return {
    selectListFunc: selectListFunc(serviceBaseUrl),
    selectByIdFunc: selectByIdFunc(serviceBaseUrl),
  } as IdentityRoleApi;
}
