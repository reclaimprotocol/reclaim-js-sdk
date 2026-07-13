import { getProviderHashRequirementSpecFromProviderConfig, verifyProof } from '@reclaimprotocol/js-sdk';

const main = async () => {
    try {
        const sessionId = '705d3c55f0';
        const response = await fetch(`https://api.reclaimprotocol.org/api/sdk/session/${sessionId}`);
        const proofs = (await response.json()).session.proofs;
        const results = await verifyProof(proofs, { providerId: 'ff2e4102-1a0a-408a-b209-26883199b39a', providerVersion: '3.0.19' });
        console.info(results);
    } catch (e){
        console.error(e);
    }
}

main();
