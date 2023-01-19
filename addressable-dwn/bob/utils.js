import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';
import { ProtocolsQuery, RecordsQuery, RecordsWrite, ProtocolsConfigure } from "@tbd54566975/dwn-sdk-js";
import { generateKeyPair, DID, resolve } from '@decentralized-identity/ion-tools';
import { DIDKey } from '../src/lib/did-key.js';

// __filename and __dirname are not defined in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getDIDState() {
  const didStateFilePath = `${__dirname}/did-state.json`;
  if (fs.existsSync(didStateFilePath)) {
    const didState = fs.readFileSync(`${__dirname}/did-state.json`, { encoding: 'utf8' });

    return JSON.parse(didState);
  }


  const authnKeyPair = await generateKeyPair('Ed25519');
  const authnKeyId = 'key-1';

  const createOptions = {
    publicKeys: [
      {
        id: authnKeyId,
        type: 'JsonWebKey2020',
        publicKeyJwk: authnKeyPair.publicJwk,
        purposes: ['authentication']
      }
    ],
    services: [
      {
        'id': 'dwn',
        'type': 'DecentralizedWebNode',
        'serviceEndpoint': {
          'nodes': ['http://localhost:3000']
        }
      }
    ]
  };

  const did = new DID({ content: createOptions });
  const longFormDID = await did.getURI('long');
  const ops = await did.getAllOperations();

  const kid = `${longFormDID}#${authnKeyId}`
  const alg = 'EdDSA';

  authnKeyPair.privateJwk.alg = alg;
  authnKeyPair.privateJwk.kid = kid;

  authnKeyPair.publicJwk.alg = alg;
  authnKeyPair.publicJwk.kid = kid;

  const state = {
    longFormDID,
    ops,
    signatureMaterial: {
      privateJwk: authnKeyPair.privateJwk,
      protectedHeader: {
        alg,
        kid
      }
    }
  };

  fs.writeFileSync(`${__dirname}/did-state.json`, JSON.stringify(state, null, 2));

}

export async function getDWNHosts(did) {
  try {
    const { didDocument } = await resolve(did);

    const { service = [] } = didDocument;

    for (const svc of service) {
      if (svc.type === 'DecentralizedWebNode') {
        return svc.serviceEndpoint.nodes;
      }
    }

    if (dwnHosts.length === 0) {
      console.error(`recipient does not have any DWNs listed in their DID Document`);
      console.error(JSON.stringify(didDocument, null, 2));

      return [];
    }
  } catch (error) {
    console.error(`Failed to resolve recipient DID: ${did}. Error: ${error.message}`);
    throw error;
  }
}

export async function sendDWNMessage(host, message) {
  try {
    const response = await fetch(`${host}/dwn`, {
      method: 'POST',
      body: JSON.stringify(message.toJSON())
    });

    return await response.json();
  } catch (error) {
    console.error(`Failed to send message to recipient. Error: ${error.message}`);
    process.exit(1);
  }
}

export async function protocolsQuery(didState, filter) {
  const [dwnHost] = await getDWNHosts(didState.longFormDID);

  if (!dwnHost) {
    throw new Error('no dwn host found');
  }


  const message = await ProtocolsQuery.create({
    target: didState.longFormDID,
    signatureInput: didState.signatureMaterial,
    filter
  });


  return await sendDWNMessage(dwnHost, message);
}

export async function protocolsConfigure(didState, name, definition) {
  const [dwnHost] = await getDWNHosts(didState.longFormDID);

  if (!dwnHost) {
    throw new Error('no dwn host found');
  }

  const message = await ProtocolsConfigure.create({
    protocol: name,
    target: didState.longFormDID,
    signatureInput: didState.signatureMaterial,
    definition
  });

  return await sendDWNMessage(dwnHost, message);
}

export async function recordsQuery(didState, filter) {
  const [dwnHost] = await getDWNHosts(didState.longFormDID);

  if (!dwnHost) {
    throw new Error('no dwn host found');
  }

  const message = await RecordsQuery.create({
    target: didState.longFormDID,
    signatureInput: didState.signatureMaterial,
    filter
  });


  return await sendDWNMessage(dwnHost, message);
}

export async function recordsWrite(didState, data, options) {
  const [dwnHost] = await getDWNHosts(didState.longFormDID);

  if (!dwnHost) {
    throw new Error('no dwn host found');
  }

  const encoder = new TextEncoder();

  const dataStringified = JSON.stringify(data);
  const dataBytes = encoder.encode(dataStringified);

  const message = await RecordsWrite.create({
    data: dataBytes,
    dataFormat: 'application/json',
    signatureInput: didState.signatureMaterial,
    ...options
  });

  return await sendDWNMessage(dwnHost, message);
}

export async function createProfile() {
  const { did, publicJWK, privateJWK } = await DIDKey.generate();
  const { alg, kid } = publicJWK;

  const signatureMaterial = {
    protectedHeader: { alg, kid },
    privateJwk: privateJWK
  };

  return { did, publicJWK, privateJWK, signatureMaterial }
}

/**
 * Generates a random alpha-numeric string.
 */
export function randomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // pick characters randomly
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return randomString;
};

/**
 * Generates a random byte array of given length.
 */
export function randomBytes(length) {
  const random = randomString(length);
  return new TextEncoder().encode(random);
};

/**
 * The maximum is exclusive and the minimum is inclusive
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min) + min);
}
