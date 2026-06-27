import { useCallback, useState } from 'react'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import './App.css'

function App() {
  const [providerId, setProviderId] = useState<string>("example")
  const [reclaimRequest, setReclaimRequest] = useState<ReclaimProofRequest | undefined>()
  const [status, setStatus] = useState<string>("")

  const sessionId = reclaimRequest?.getSessionId()

  const createReclaimRequestCallback = useCallback(async () => {
    if (!providerId) return;
    setStatus("Creating request…");
    try {
      const request = await ReclaimProofRequest.init(
        import.meta.env.VITE_PUBLIC_RECLAIM_APP_ID,
        import.meta.env.VITE_PUBLIC_RECLAIM_APP_SECRET,
        providerId,
        {
          launchOptions: {
            canUseDeferredDeepLinksFlow: true,
            verificationMode: 'app',
          },
          useAppClip: true,
          log: true,
        }
      );
      setReclaimRequest(request);
      setStatus("Request ready. Click “Start Verification”.");
    } catch (e) {
      console.error(e);
      setStatus(`Failed to create request: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [providerId]);

  const startVerificationCallback = useCallback(async () => {
    if (!reclaimRequest) return;
    setStatus("Starting verification…");
    try {
      await reclaimRequest.triggerReclaimFlow({
        verificationMode: 'app',
      });
      await reclaimRequest.startSession({
        onSuccess: (proofs) => {
          console.log("Verification success", proofs);
          setStatus("Verification successful 🎉");
        },
        onError: (error) => {
          console.error("Verification failed", error);
          setStatus(`Verification failed: ${error.message}`);
        },
      });
    } catch (e) {
      console.error(e);
      setStatus(`Failed to start verification: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [reclaimRequest]);

  return (
    <>
      <section id="center">
        <div className="intro">
          <h1>Get started</h1>
          <p>
            Verifying for your app <code>{import.meta.env.VITE_PUBLIC_RECLAIM_APP_ID}</code>.
          </p>
          <br />
          {sessionId && <p>Session Id is <code>{sessionId}</code></p>}
        </div>
        <div className="field">
          <label htmlFor="providerId">Provider Id</label>
          <input
            id="providerId"
            type="text"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="Type a provider id…"
          />
        </div>
        <div className="actions">
          <button
            type="button"
            className="counter"
            onClick={createReclaimRequestCallback}
            disabled={!providerId}
          >
            Create Request
          </button>
          <button
            type="button"
            className="counter"
            onClick={startVerificationCallback}
            disabled={!reclaimRequest}
          >
            Start Verification
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://docs.reclaimprotocol.org/" target="_blank">
                Explore Reclaim Protocol
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Reclaim Protocol community</p>
          <ul>
            <li>
              <a href="https://github.com/reclaimprotocol" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://x.com/reclaimprotocol" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
