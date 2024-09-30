import type { Beacon, BeaconState } from './utils/interfaces';
import { Reclaim__factory as ReclaimFactory } from './contract-types';
import CONTRACTS_CONFIG from './contract-types/config.json';
import { Contract, ethers } from 'ethers';

const DEFAULT_CHAIN_ID = 11155420;

export function makeBeacon(chainId?: number): Beacon | undefined {
  chainId = chainId || DEFAULT_CHAIN_ID;
  const contract = getContract(chainId);
  if (contract) {
    return makeBeaconCacheable({
      async getState(epochId: number | undefined): Promise<BeaconState> {
        //@ts-ignore
        const epoch = await contract.fetchEpoch(epochId || 0);
        if (!epoch.id) {
          throw new Error(`Invalid epoch ID: ${epochId}`);
        }

        return {
          epoch: epoch.id,
          witnesses: epoch.witnesses.map((w: any) => ({
            id: w.addr.toLowerCase(),
            url: w.host,
          })),
          witnessesRequiredForClaim: epoch.minimumWitnessesForClaimCreation,
          nextEpochTimestampS: epoch.timestampEnd,
        };
      },
    });
  } else {
    return undefined;
  }
}

export function makeBeaconCacheable(beacon: Beacon): Beacon {
  const cache: { [epochId: number]: Promise<BeaconState> } = {};

  return {
    ...beacon,
    async getState(epochId: number | undefined): Promise<BeaconState> {
      if (!epochId) {
        // TODO: add cache here
        const state = await beacon.getState();
        return state;
      }

      const key = epochId;

      if (!cache[key]) {
        cache[key] = beacon.getState(epochId);
      }

      return cache[key] as unknown as BeaconState;
    },
  };
}

const existingContractsMap: { [chain: string]: Contract } = {};

function getContract(chainId: number): Contract {
  const chainKey = `0x${chainId.toString(16)}`;
  if (!existingContractsMap[chainKey]) {
    const contractData =
      CONTRACTS_CONFIG[chainKey as keyof typeof CONTRACTS_CONFIG];
    if (!contractData) {
      throw new Error(`Unsupported chain: "${chainKey}"`);
    }

    const rpcProvider = new ethers.JsonRpcProvider(contractData.rpcUrl);
    existingContractsMap[chainKey] = ReclaimFactory.connect(
      contractData.address,
      rpcProvider
    );
  }

  return existingContractsMap[chainKey] as Contract;
}
