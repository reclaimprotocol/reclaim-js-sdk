"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Reclaim: () => Reclaim
});
module.exports = __toCommonJS(src_exports);

// src/witness.ts
var import_ethers = require("ethers");
function fetchWitnessListForClaim({ witnesses, witnessesRequiredForClaim, epoch }, params, timestampS) {
  const identifier = typeof params === "string" ? params : getIdentifierFromClaimInfo(params);
  const completeInput = [
    identifier,
    epoch.toString(),
    witnessesRequiredForClaim.toString(),
    timestampS.toString()
  ].join("\n");
  const completeHashStr = import_ethers.ethers.keccak256(strToUint8Array(completeInput));
  const completeHash = import_ethers.ethers.getBytes(completeHashStr);
  const completeHashView = uint8ArrayToDataView(completeHash);
  const witnessesLeft = [...witnesses];
  const selectedWitnesses = [];
  let byteOffset = 0;
  for (let i = 0; i < witnessesRequiredForClaim; i++) {
    const randomSeed = completeHashView.getUint32(byteOffset);
    const witnessIndex = randomSeed % witnessesLeft.length;
    const witness = witnessesLeft[witnessIndex];
    selectedWitnesses.push(witness);
    witnessesLeft[witnessIndex] = witnessesLeft[witnessesLeft.length - 1];
    witnessesLeft.pop();
    byteOffset = (byteOffset + 4) % completeHash.length;
  }
  return selectedWitnesses;
}
function getIdentifierFromClaimInfo(info) {
  const str = `${info.provider}
${info.parameters}
${info.context || ""}`;
  return import_ethers.ethers.keccak256(strToUint8Array(str)).toLowerCase();
}
function strToUint8Array(str) {
  return new TextEncoder().encode(str);
}
function uint8ArrayToDataView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function createSignDataForClaim(data) {
  const identifier = "identifier" in data ? data.identifier : getIdentifierFromClaimInfo(data);
  const lines = [
    identifier,
    data.owner.toLowerCase(),
    data.timestampS.toString(),
    data.epoch.toString()
  ];
  return lines.join("\n");
}

// src/Reclaim.ts
var import_uuid = require("uuid");
var import_ethers5 = require("ethers");
var import_canonicalize2 = __toESM(require("canonicalize"));

// src/utils.ts
var import_url_parse = __toESM(require("url-parse"));
var import_ethers4 = require("ethers");

// src/contract-types/contracts/factories/Reclaim__factory.ts
var import_ethers2 = require("ethers");
var _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address"
      }
    ],
    name: "BeaconUpgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "uint32",
            name: "id",
            type: "uint32"
          },
          {
            internalType: "uint32",
            name: "timestampStart",
            type: "uint32"
          },
          {
            internalType: "uint32",
            name: "timestampEnd",
            type: "uint32"
          },
          {
            components: [
              {
                internalType: "address",
                name: "addr",
                type: "address"
              },
              {
                internalType: "string",
                name: "host",
                type: "string"
              }
            ],
            internalType: "struct Reclaim.Witness[]",
            name: "witnesses",
            type: "tuple[]"
          },
          {
            internalType: "uint8",
            name: "minimumWitnessesForClaimCreation",
            type: "uint8"
          }
        ],
        indexed: false,
        internalType: "struct Reclaim.Epoch",
        name: "epoch",
        type: "tuple"
      }
    ],
    name: "EpochAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8"
      }
    ],
    name: "Initialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address"
      }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "witnessAddress",
        type: "address"
      },
      {
        internalType: "string",
        name: "host",
        type: "string"
      }
    ],
    name: "addAsWitness",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "addNewEpoch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "epochNum",
        type: "uint32"
      },
      {
        components: [
          {
            internalType: "string",
            name: "provider",
            type: "string"
          },
          {
            internalType: "string",
            name: "parameters",
            type: "string"
          },
          {
            internalType: "string",
            name: "context",
            type: "string"
          }
        ],
        internalType: "struct Claims.ClaimInfo",
        name: "claimInfo",
        type: "tuple"
      },
      {
        components: [
          {
            internalType: "bytes32",
            name: "identifier",
            type: "bytes32"
          },
          {
            internalType: "address",
            name: "owner",
            type: "address"
          },
          {
            internalType: "uint32",
            name: "timestampS",
            type: "uint32"
          },
          {
            internalType: "uint256",
            name: "epoch",
            type: "uint256"
          }
        ],
        internalType: "struct Claims.CompleteClaimData",
        name: "claimData",
        type: "tuple"
      },
      {
        internalType: "bytes[]",
        name: "signatures",
        type: "bytes[]"
      }
    ],
    name: "assertValidEpochAndSignedClaim",
    outputs: [],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "currentEpoch",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "epochDurationS",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "epochs",
    outputs: [
      {
        internalType: "uint32",
        name: "id",
        type: "uint32"
      },
      {
        internalType: "uint32",
        name: "timestampStart",
        type: "uint32"
      },
      {
        internalType: "uint32",
        name: "timestampEnd",
        type: "uint32"
      },
      {
        internalType: "uint8",
        name: "minimumWitnessesForClaimCreation",
        type: "uint8"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "epoch",
        type: "uint32"
      }
    ],
    name: "fetchEpoch",
    outputs: [
      {
        components: [
          {
            internalType: "uint32",
            name: "id",
            type: "uint32"
          },
          {
            internalType: "uint32",
            name: "timestampStart",
            type: "uint32"
          },
          {
            internalType: "uint32",
            name: "timestampEnd",
            type: "uint32"
          },
          {
            components: [
              {
                internalType: "address",
                name: "addr",
                type: "address"
              },
              {
                internalType: "string",
                name: "host",
                type: "string"
              }
            ],
            internalType: "struct Reclaim.Witness[]",
            name: "witnesses",
            type: "tuple[]"
          },
          {
            internalType: "uint8",
            name: "minimumWitnessesForClaimCreation",
            type: "uint8"
          }
        ],
        internalType: "struct Reclaim.Epoch",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "epoch",
        type: "uint32"
      },
      {
        internalType: "bytes32",
        name: "identifier",
        type: "bytes32"
      },
      {
        internalType: "uint32",
        name: "timestampS",
        type: "uint32"
      }
    ],
    name: "fetchWitnessesForClaim",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "addr",
            type: "address"
          },
          {
            internalType: "string",
            name: "host",
            type: "string"
          }
        ],
        internalType: "struct Reclaim.Witness[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "minimumWitnessesForClaimCreation",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "witnessAddress",
        type: "address"
      }
    ],
    name: "removeAsWitness",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address"
      },
      {
        internalType: "bool",
        name: "isWhitelisted",
        type: "bool"
      }
    ],
    name: "updateWitnessWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      }
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "witnesses",
    outputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address"
      },
      {
        internalType: "string",
        name: "host",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
var Reclaim__factory = class {
  static connect(address, signerOrProvider) {
    return new import_ethers2.Contract(address, _abi, signerOrProvider);
  }
};
Reclaim__factory.abi = _abi;

// src/contract-types/config.json
var config_default = {
  "0x1a4": {
    chainName: "opt-goerli",
    address: "0xF93F605142Fb1Efad7Aa58253dDffF67775b4520",
    rpcUrl: "https://opt-goerli.g.alchemy.com/v2/rksDkSUXd2dyk2ANy_zzODknx_AAokui"
  },
  "0xaa37dc": {
    chainName: "opt-sepolia",
    address: "0x6D0f81BDA11995f25921aAd5B43359630E65Ca96",
    rpcUrl: "https://opt-sepolia.g.alchemy.com/v2/aO1-SfG4oFRLyAiLREqzyAUu0HTCwHgs"
  }
};

// src/smart-contract.ts
var import_ethers3 = require("ethers");
var DEFAULT_CHAIN_ID = 11155420;
function makeBeacon(chainId) {
  chainId = chainId || DEFAULT_CHAIN_ID;
  const contract = getContract(chainId);
  if (contract) {
    let _a;
    return makeBeaconCacheable({
      getState(epochId) {
        return __async(this, null, function* () {
          const epoch = yield contract.fetchEpoch(epochId || 0);
          if (!epoch.id) {
            throw new Error(`Invalid epoch ID: ${epochId}`);
          }
          return {
            epoch: epoch.id,
            witnesses: epoch.witnesses.map((w) => ({
              id: w.addr.toLowerCase(),
              url: w.host
            })),
            witnessesRequiredForClaim: epoch.minimumWitnessesForClaimCreation,
            nextEpochTimestampS: epoch.timestampEnd
          };
        });
      }
    });
  } else {
    return void 0;
  }
}
function makeBeaconCacheable(beacon) {
  const cache = {};
  return __spreadProps(__spreadValues({}, beacon), {
    getState(epochId) {
      return __async(this, null, function* () {
        if (!epochId) {
          const state = yield beacon.getState();
          return state;
        }
        const key = epochId;
        if (!cache[key]) {
          cache[key] = beacon.getState(epochId);
        }
        return cache[key];
      });
    }
  });
}
var existingContractsMap = {};
function getContract(chainId) {
  const chainKey = `0x${chainId.toString(16)}`;
  if (!existingContractsMap[chainKey]) {
    const contractData = config_default[chainKey];
    if (!contractData) {
      throw new Error(`Unsupported chain: "${chainKey}"`);
    }
    const rpcProvider = new import_ethers3.ethers.JsonRpcProvider(contractData.rpcUrl);
    existingContractsMap[chainKey] = Reclaim__factory.connect(
      contractData.address,
      rpcProvider
    );
  }
  return existingContractsMap[chainKey];
}

// src/utils.ts
var import_canonicalize = __toESM(require("canonicalize"));

// src/constants.ts
var BACKEND_BASE_URL = "https://api.reclaimprotocol.org";
var constants = {
  GET_PROVIDERS_BY_ID_API: BACKEND_BASE_URL + "/api/applications",
  DEFAULT_RECLAIM_CALLBACK_URL: BACKEND_BASE_URL + "/api/sdk/callback?callbackId=",
  DEFAULT_RECLAIM_STATUS_URL: BACKEND_BASE_URL + "/api/sdk/session/",
  RECLAIM_SHARE_URL: "https://share.reclaimprotocol.org/instant/?template=",
  RECLAIM_GET_BRANCH_URL: BACKEND_BASE_URL + "/api/sdk/get-branch-url"
};

// src/errors.ts
var TimeoutError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
};
var ProofNotVerifiedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProofNotVerifiedError";
  }
};
var SessionNotStartedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SessionNotStartedError";
  }
};
var ProviderAPIError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderAPIError";
  }
};
var BuildProofRequestError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildProofRequest";
  }
};
var SignatureNotFoundError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SignatureNotFound";
  }
};
var InvalidSignatureError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidSignatureError";
  }
};
var UpdateSessionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UpdateSessionError";
  }
};
var CreateSessionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CreateSessionError";
  }
};
var ProviderFailedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderFailedError";
  }
};
var InvalidParamError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidParamError";
  }
};
var ApplicationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ApplicationError";
  }
};

// src/utils.ts
function validateNotNullOrUndefined(input, paramName, functionName) {
  if (input == null) {
    throw new InvalidParamError(`${paramName} passed to ${functionName} must not be null or undefined.`);
  }
}
function validateNonEmptyString(input, paramName, functionName) {
  if (typeof input !== "string") {
    throw new InvalidParamError(`${paramName} passed to ${functionName} must be a string.`);
  }
  if (input.trim() === "") {
    throw new InvalidParamError(`${paramName} passed to ${functionName} must be a non-empty string.`);
  }
}
function validateURL(url, functionName) {
  validateNotNullOrUndefined(url, "url", functionName);
  validateNonEmptyString(url, "url", functionName);
  try {
    new import_url_parse.default(url);
  } catch (e) {
    throw new InvalidParamError(`Invalid URL format passed to ${functionName}.`);
  }
}
function getWitnessesForClaim(epoch, identifier, timestampS) {
  return __async(this, null, function* () {
    const beacon = makeBeacon();
    if (!beacon)
      throw new Error("No beacon");
    const state = yield beacon.getState(epoch);
    const witnessList = fetchWitnessListForClaim(state, identifier, timestampS);
    return witnessList.map((w) => w.id.toLowerCase());
  });
}
function recoverSignersOfSignedClaim({
  claim,
  signatures
}) {
  const dataStr = createSignDataForClaim(__spreadValues({}, claim));
  return signatures.map(
    (signature) => import_ethers4.ethers.verifyMessage(dataStr, import_ethers4.ethers.hexlify(signature)).toLowerCase()
  );
}
function assertValidSignedClaim(claim, expectedWitnessAddresses) {
  const witnessAddresses = recoverSignersOfSignedClaim(claim);
  const witnessesNotSeen = new Set(expectedWitnessAddresses);
  for (const witness of witnessAddresses) {
    if (witnessesNotSeen.has(witness)) {
      witnessesNotSeen.delete(witness);
    }
  }
  if (witnessesNotSeen.size > 0) {
    throw new ProofNotVerifiedError(
      `Missing signatures from ${expectedWitnessAddresses.join(", ")}`
    );
  }
}
function getShortenedUrl(url) {
  return __async(this, null, function* () {
    try {
      validateURL(url, "getShortenedUrl");
      const response = yield fetch(BACKEND_BASE_URL + "/api/sdk/shortener", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullUrl: url
        })
      });
      const res = yield response.json();
      const shortenedVerificationUrl = res.result.shortUrl;
      return shortenedVerificationUrl;
    } catch (err) {
      return url;
    }
  });
}
function createSession(sessionId, appId, providerId) {
  return __async(this, null, function* () {
    validateNotNullOrUndefined(sessionId, "sessionId", "createSession");
    validateNotNullOrUndefined(appId, "appId", "createSession");
    validateNotNullOrUndefined(providerId, "providerId", "createSession");
    validateNonEmptyString(sessionId, "sessionId", "createSession");
    validateNonEmptyString(appId, "appId", "createSession");
    validateNonEmptyString(providerId, "providerId", "createSession");
    try {
      const response = yield fetch(BACKEND_BASE_URL + "/api/sdk/create-session/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          appId,
          providerId
        })
      });
      if (!response.ok) {
        throw new CreateSessionError("Error creating session with sessionId: " + sessionId);
      }
      const res = yield response.json();
      return res;
    } catch (err) {
      throw new CreateSessionError("Error creating session with sessionId: " + sessionId);
    }
  });
}
function updateSession(sessionId, status) {
  return __async(this, null, function* () {
    validateNotNullOrUndefined(sessionId, "sessionId", "updateSession");
    validateNonEmptyString(sessionId, "sessionId", "updateSession");
    try {
      const response = yield fetch(BACKEND_BASE_URL + "/api/sdk/update-session/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          status
        })
      });
      if (!response.ok) {
        throw new UpdateSessionError("Error updating session with sessionId: " + sessionId);
      }
      const res = yield response.json();
      return res;
    } catch (err) {
      throw new UpdateSessionError("Error updating session with sessionId: " + sessionId);
    }
  });
}
function fetchProvidersByAppId(appId, providerId) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(`${constants.GET_PROVIDERS_BY_ID_API}/${appId}/provider/${providerId}`);
      if (response.status === 404) {
        throw new ApplicationError("Application not found with AppId: " + appId);
      }
      if (response.status !== 200) {
        throw new Error();
      }
      const res = yield response.json();
      return res.providers.httpProvider;
    } catch (err) {
      if (err instanceof ApplicationError) {
        throw err;
      }
      throw new ProviderAPIError("Error fetching provider with AppId: " + appId);
    }
  });
}
function validateProviderIdsAndReturnProviders(providerId, providers) {
  let providerExists = providers.some((provider) => providerId == provider.httpProviderId);
  if (!providerExists) {
    throw new ProviderAPIError(`The following provider Id is not included in your application => ${providerId}`);
  }
  return providers.find((provider) => providerId == provider.httpProviderId);
}
function generateRequestedProofs(provider, context, callbackUrl, statusUrl, sessionId, redirectUser) {
  const providerParams = {};
  provider.responseSelections.forEach((rs) => rs.responseMatch.split(/{{(.*?)}}/).filter((e, i) => i % 2).forEach((param) => providerParams[param] = void 0));
  const claims = [{
    provider: encodeURIComponent(provider.name),
    context: JSON.stringify(context),
    httpProviderId: provider.httpProviderId,
    payload: {
      metadata: {
        name: encodeURIComponent(provider.name),
        logoUrl: provider.logoUrl,
        proofCardText: provider.proofCardText,
        proofCardTitle: provider.proofCardTitle
      },
      url: provider.url,
      urlType: provider.urlType,
      method: provider.method,
      login: {
        url: provider.loginUrl
      },
      responseSelections: provider.responseSelections,
      customInjection: provider.customInjection,
      bodySniff: provider.bodySniff,
      userAgent: provider.userAgent,
      geoLocation: provider.geoLocation,
      matchType: provider.matchType,
      injectionType: provider.injectionType,
      disableRequestReplay: provider.disableRequestReplay,
      verificationType: provider.verificationType,
      parameters: providerParams
    }
  }];
  return {
    id: sessionId,
    sessionId,
    name: redirectUser ? "web-r-SDK" : "web-SDK",
    callbackUrl,
    statusUrl,
    claims
  };
}
function validateSignature(requestedProofs, signature, applicationId, linkingVersion, timeStamp) {
  var _a, _b;
  try {
    let appId = "";
    if (requestedProofs.claims.length && (linkingVersion === "V2Linking" || ((_b = (_a = requestedProofs.claims[0]) == null ? void 0 : _a.payload) == null ? void 0 : _b.verificationType) === "MANUAL")) {
      appId = import_ethers4.ethers.verifyMessage(
        import_ethers4.ethers.getBytes(
          import_ethers4.ethers.keccak256(
            new TextEncoder().encode((0, import_canonicalize.default)({
              providerId: requestedProofs.claims[0].httpProviderId,
              timestamp: timeStamp
            }))
          )
        ),
        import_ethers4.ethers.hexlify(signature)
      ).toLowerCase();
    } else {
      appId = import_ethers4.ethers.verifyMessage(
        import_ethers4.ethers.getBytes(
          import_ethers4.ethers.keccak256(
            new TextEncoder().encode((0, import_canonicalize.default)(requestedProofs))
          )
        ),
        import_ethers4.ethers.hexlify(signature)
      ).toLowerCase();
    }
    if (import_ethers4.ethers.getAddress(appId) !== import_ethers4.ethers.getAddress(applicationId)) {
      throw new InvalidSignatureError(`Signature does not match the application id: ${appId}`);
    }
  } catch (err) {
    throw err;
  }
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}
function getBranchLink(template) {
  return __async(this, null, function* () {
    try {
      const options = {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          template
        })
      };
      const response = yield fetch(constants.RECLAIM_GET_BRANCH_URL, options);
      if (response.status !== 200) {
        throw new Error(
          "Error creating verification request - Branch Link not created"
        );
      }
      const data = yield response.json();
      const link = data == null ? void 0 : data.branchUrl;
      if (!link) {
        throw new Error(
          "Error creating verification request - Branch Link not created"
        );
      }
      return link;
    } catch (err) {
      throw err;
    }
  });
}

// src/Reclaim.ts
var import_pino = __toESM(require("pino"));
var logger = (0, import_pino.default)();
var _Reclaim = class _Reclaim {
  static verifySignedProof(proof) {
    return __async(this, null, function* () {
      var _a;
      if (!proof.signatures.length) {
        throw new Error("No signatures");
      }
      let witnesses = [];
      if (proof.witnesses.length && ((_a = proof.witnesses[0]) == null ? void 0 : _a.url) === "manual-verify") {
        witnesses.push(proof.witnesses[0].id);
      } else {
        witnesses = yield getWitnessesForClaim(
          proof.claimData.epoch,
          proof.identifier,
          proof.claimData.timestampS
        );
      }
      try {
        const calculatedIdentifier = getIdentifierFromClaimInfo({
          parameters: JSON.parse(
            (0, import_canonicalize2.default)(proof.claimData.parameters)
          ),
          provider: proof.claimData.provider,
          context: proof.claimData.context
        });
        proof.identifier = replaceAll(proof.identifier, '"', "");
        if (calculatedIdentifier !== proof.identifier) {
          throw new ProofNotVerifiedError("Identifier Mismatch");
        }
        const signedClaim = {
          claim: __spreadValues({}, proof.claimData),
          signatures: proof.signatures.map((signature) => {
            return import_ethers5.ethers.getBytes(signature);
          })
        };
        assertValidSignedClaim(signedClaim, witnesses);
      } catch (e) {
        logger.error(e);
        return false;
      }
      return true;
    });
  }
  static transformForOnchain(proof) {
    const claimInfoBuilder = /* @__PURE__ */ new Map([
      ["context", proof.claimData.context],
      ["parameters", proof.claimData.parameters],
      ["provider", proof.claimData.provider]
    ]);
    const claimInfo = Object.fromEntries(claimInfoBuilder);
    const claimBuilder = /* @__PURE__ */ new Map([
      ["epoch", proof.claimData.epoch],
      ["identifier", proof.claimData.identifier],
      ["owner", proof.claimData.owner],
      ["timestampS", proof.claimData.timestampS]
    ]);
    const signedClaim = {
      claim: Object.fromEntries(claimBuilder),
      signatures: proof.signatures
    };
    return { claimInfo, signedClaim };
  }
  static verifyProvider(proof, providerHash) {
    try {
      validateNotNullOrUndefined(providerHash, "applicationId", "verifyProvider function");
      validateNotNullOrUndefined(proof, "proof", "verifyProvider function");
      validateNonEmptyString(providerHash, "applicationId", "verifyProvider function");
      validateNonEmptyString(proof.claimData.context, "context", "verifyProvider function");
      const jsonContext = JSON.parse(proof.claimData.context);
      if (!jsonContext.providerHash) {
        logger.info(`ProviderHash is not included in proof's context`);
        return false;
      }
      if (providerHash !== jsonContext.providerHash) {
        logger.info(`ProviderHash in context: ${jsonContext.providerHash} does not match the stored providerHash: ${providerHash}`);
        return false;
      }
      return true;
    } catch (e) {
      logger.error(e);
      return false;
    }
  }
};
_Reclaim.ProofRequest = class {
  constructor(applicationId, options) {
    this.context = { contextAddress: "0x0", contextMessage: "" };
    this.intervals = /* @__PURE__ */ new Map();
    validateNotNullOrUndefined(applicationId, "applicationId", "the constructor");
    validateNonEmptyString(applicationId, "applicationId", "the constructor");
    if (options == null ? void 0 : options.sessionId) {
      validateNonEmptyString(options == null ? void 0 : options.sessionId, "sessionId", "the constructor");
    }
    this.linkingVersion = "V1";
    this.applicationId = applicationId;
    this.sessionId = (options == null ? void 0 : options.sessionId) || (0, import_uuid.v4)().toString();
    logger.level = (options == null ? void 0 : options.log) ? "info" : "silent";
    logger.info(
      `Initializing client with applicationId: ${this.applicationId} and sessionId: ${this.sessionId}`
    );
    this.timeStamp = Date.now().toString();
  }
  addContext(address, message) {
    validateNotNullOrUndefined(address, "address", "addContext");
    validateNotNullOrUndefined(message, "message", "addContext");
    this.context = { contextAddress: address, contextMessage: message };
  }
  setAppCallbackUrl(url) {
    validateURL(url, "setAppCallbackUrl");
    const urlObj = new URL(url);
    urlObj.searchParams.append("callbackId", this.sessionId);
    this.appCallbackUrl = urlObj.toString();
  }
  setRedirectUrl(url) {
    validateURL(url, "setRedirectUrl");
    const urlObj = new URL(url);
    this.redirectUrl = urlObj.toString();
  }
  setStatusUrl(url) {
    validateURL(url, "setStatusUrl");
    this.statusUrl = url;
  }
  setSignature(signature) {
    validateNotNullOrUndefined(signature, "signature", "setSignature");
    validateNonEmptyString(signature, "signature", "setSignature");
    this.signature = signature;
  }
  getAppCallbackUrl() {
    return this.appCallbackUrl || `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`;
  }
  getStatusUrl() {
    return this.statusUrl || `${constants.DEFAULT_RECLAIM_STATUS_URL}${this.sessionId}`;
  }
  getRequestedProofs() {
    try {
      if (!this.requestedProofs) {
        throw new BuildProofRequestError(
          "Call buildProofRequest(providerId: string) first!"
        );
      }
      return this.requestedProofs;
    } catch (err) {
      throw err;
    }
  }
  generateSignature(applicationSecret) {
    return __async(this, null, function* () {
      var _a, _b;
      try {
        const wallet = new import_ethers5.ethers.Wallet(applicationSecret);
        const requestedProofs = this.getRequestedProofs();
        if (requestedProofs.claims.length && (this.linkingVersion === "V2Linking" || ((_b = (_a = requestedProofs.claims[0]) == null ? void 0 : _a.payload) == null ? void 0 : _b.verificationType) === "MANUAL")) {
          const signature2 = yield wallet.signMessage(
            import_ethers5.ethers.getBytes(
              import_ethers5.ethers.keccak256(
                new TextEncoder().encode(
                  (0, import_canonicalize2.default)({
                    providerId: requestedProofs.claims[0].httpProviderId,
                    timestamp: this.timeStamp
                  })
                )
              )
            )
          );
          return signature2;
        }
        const signature = yield wallet.signMessage(
          import_ethers5.ethers.getBytes(
            import_ethers5.ethers.keccak256(
              new TextEncoder().encode(
                (0, import_canonicalize2.default)(requestedProofs)
              )
            )
          )
        );
        return signature;
      } catch (err) {
        logger.error(err);
        throw new BuildProofRequestError(
          "Error generating signature for applicationSecret: " + applicationSecret
        );
      }
    });
  }
  buildProofRequest(providerId, redirectUser = false, linkingVersion) {
    return __async(this, null, function* () {
      let providers = yield fetchProvidersByAppId(this.applicationId, providerId);
      const provider = validateProviderIdsAndReturnProviders(
        providerId,
        providers
      );
      try {
        this.providerId = providerId;
        this.requestedProofs = generateRequestedProofs(
          provider,
          this.context,
          this.getAppCallbackUrl(),
          this.getStatusUrl(),
          this.sessionId,
          redirectUser
        );
        if (linkingVersion) {
          if (linkingVersion === "V2Linking") {
            this.linkingVersion = linkingVersion;
          } else {
            throw new BuildProofRequestError(
              "Invalid linking version. Supported linking versions are V2Linking"
            );
          }
        }
        return this.requestedProofs;
      } catch (err) {
        logger.error(err);
        throw new BuildProofRequestError(
          "Something went wrong while generating proof request"
        );
      }
    });
  }
  createVerificationRequest() {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      try {
        const requestedProofs = yield this.getRequestedProofs();
        if (!requestedProofs) {
          throw new BuildProofRequestError(
            "Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!"
          );
        }
        if (!this.signature) {
          throw new SignatureNotFoundError(
            "Signature is not set. Use reclaim.setSignature(signature) to set the signature"
          );
        }
        validateSignature(requestedProofs, this.signature, this.applicationId, this.linkingVersion, this.timeStamp);
        let templateData = {};
        if (requestedProofs.claims.length && (this.linkingVersion === "V2Linking" || ((_b = (_a = requestedProofs.claims[0]) == null ? void 0 : _a.payload) == null ? void 0 : _b.verificationType) === "MANUAL")) {
          templateData = {
            sessionId: this.sessionId,
            providerId: this.providerId,
            applicationId: this.applicationId,
            signature: this.signature,
            timestamp: this.timeStamp,
            callbackUrl: this.getAppCallbackUrl(),
            context: JSON.stringify(this.context),
            verificationType: requestedProofs.claims[0].payload.verificationType,
            parameters: requestedProofs.claims[0].payload.parameters,
            redirectUrl: (_c = this.redirectUrl) != null ? _c : ""
          };
        } else {
          templateData = __spreadProps(__spreadValues({}, requestedProofs), {
            signature: this.signature
          });
        }
        let template = encodeURIComponent(
          JSON.stringify(templateData)
        );
        template = replaceAll(template, "(", "%28");
        template = replaceAll(template, ")", "%29");
        let link = "";
        if (requestedProofs.claims.length && (this.linkingVersion === "V2Linking" || ((_e = (_d = requestedProofs.claims[0]) == null ? void 0 : _d.payload) == null ? void 0 : _e.verificationType) === "MANUAL")) {
          link = `https://share.reclaimprotocol.org/verifier?template=` + template;
          link = yield getShortenedUrl(link);
        } else {
          link = yield getBranchLink(template);
        }
        yield createSession(this.sessionId, this.applicationId, this.providerId);
        return { requestUrl: link, statusUrl: this.getStatusUrl() };
      } catch (error) {
        logger.error("Error creating verification request:", error);
        throw error;
      }
    });
  }
  startSession(_0) {
    return __async(this, arguments, function* ({
      onSuccessCallback,
      onFailureCallback
    }) {
      const statusUrl = this.getStatusUrl();
      if (statusUrl && this.sessionId) {
        logger.info("Starting session");
        try {
          yield updateSession(this.sessionId, "SDK_STARTED" /* SDK_STARTED */);
        } catch (e) {
          logger.error(e);
        }
        const interval = setInterval(() => __async(this, null, function* () {
          try {
            const res = yield fetch(statusUrl);
            const data = yield res.json();
            if (!data.session)
              return;
            if (data.session.status === "FAILED" /* FAILED */)
              throw new ProviderFailedError();
            if (data.session.proofs.length === 0)
              return;
            const proof = data.session.proofs[0];
            const verified = yield _Reclaim.verifySignedProof(proof);
            if (!verified) {
              throw new ProofNotVerifiedError();
            }
            if (onSuccessCallback) {
              try {
                yield updateSession(this.sessionId, "SDK_RECEIVED" /* SDK_RECEIVED */);
              } catch (e) {
                logger.error(e);
              }
              onSuccessCallback(data.session.proofs);
            }
            clearInterval(this.intervals.get(this.sessionId));
            this.intervals.delete(this.sessionId);
          } catch (e) {
            if (!(e instanceof ProviderFailedError)) {
              try {
                yield updateSession(this.sessionId, "FAILED" /* FAILED */);
              } catch (e2) {
                logger.error(e2);
              }
            }
            if (onFailureCallback) {
              onFailureCallback(e);
            }
            clearInterval(this.intervals.get(this.sessionId));
            this.intervals.delete(this.sessionId);
          }
        }), 3e3);
        this.intervals.set(this.sessionId, interval);
        this.scheduleIntervalEndingTask(onFailureCallback);
      } else {
        const message = "Session can't be started due to undefined value of statusUrl and sessionId";
        logger.error(message);
        throw new SessionNotStartedError(message);
      }
    });
  }
  scheduleIntervalEndingTask(onFailureCallback) {
    setTimeout(() => __async(this, null, function* () {
      if (this.intervals.has(this.sessionId)) {
        const message = "Interval ended without receiveing proofs";
        yield updateSession(this.sessionId, "FAILED" /* FAILED */);
        onFailureCallback(new TimeoutError(message));
        logger.warn(message);
        clearInterval(this.intervals.get(this.sessionId));
      }
    }), 1e3 * 60 * 10);
  }
  availableParams() {
    const requestedProofs = this.getRequestedProofs();
    if (!requestedProofs || !this.requestedProofs) {
      throw new BuildProofRequestError(
        "Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!"
      );
    }
    let availableParamsStore = Object.keys(requestedProofs.claims[0].payload.parameters);
    availableParamsStore = availableParamsStore.concat(requestedProofs.claims[0].payload.url.split(/{{(.*?)}}/).filter((_, i) => i % 2));
    availableParamsStore = availableParamsStore.concat(requestedProofs.claims[0].payload.login.url.split(/{{(.*?)}}/).filter((_, i) => i % 2));
    return [...new Set(availableParamsStore)];
  }
  setParams(params) {
    try {
      const requestedProofs = this.getRequestedProofs();
      if (!requestedProofs || !this.requestedProofs) {
        throw new BuildProofRequestError(
          "Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!"
        );
      }
      const availableParams = this.availableParams();
      const paramsToSet = Object.keys(params);
      for (let i = 0; i < paramsToSet.length; i++) {
        if (requestedProofs.claims[0].payload.verificationType === "WITNESS" && !availableParams.includes(paramsToSet[i])) {
          throw new InvalidParamError(
            `Cannot Set parameter ${paramsToSet[i]} for provider ${this.providerId} available Prameters inculde : ${availableParams}`
          );
        }
      }
      this.requestedProofs.claims[0].payload.parameters = __spreadValues(__spreadValues({}, requestedProofs.claims[0].payload.parameters), params);
    } catch (error) {
      logger.error("Error Setting Params:", error);
      throw error;
    }
  }
};
var Reclaim = _Reclaim;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Reclaim
});
//# sourceMappingURL=index.js.map