import { QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/access-gate.inline"

export default (() => {
  function AccessGate() {
    return (
      <div id="access-gate" style="display:none">
        <div class="access-gate-inner">
          <div class="access-gate-stamp">APE — ARCHIVO POST-EMERGENCIA</div>
          <div class="access-gate-title">AUTENTICACIÓN REQUERIDA</div>
          <p class="access-gate-desc">
            Este archivo está bajo protocolo de acceso restringido.<br />
            Ingrese su código de sujeto para continuar.
          </p>
          <div class="access-gate-field">
            <label class="access-gate-label" for="access-gate-input">// Código de archivo</label>
            <input
              id="access-gate-input"
              class="access-gate-input"
              type="text"
              placeholder="F01 — F05"
              maxLength={3}
              autoComplete="off"
              spellcheck={false}
            />
          </div>
          <div id="access-gate-error" class="access-gate-error" style="display:none"></div>
          <button id="access-gate-submit" class="access-gate-btn">
            VERIFICAR CREDENCIALES
          </button>
          <div class="access-gate-footer">
            Señal Muerta — Crónicas de la Emergencia · Protocolo <span class="redacted" style="font-size:10px">███</span>-C
          </div>
        </div>
      </div>
    )
  }

  AccessGate.afterDOMLoaded = script
  // CSS lives in custom.scss to guarantee it's bundled
  AccessGate.css = `
    #access-gate {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--light);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .access-gate-inner {
      max-width: 420px;
      width: 90%;
      border: 1px solid var(--lightgray);
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .access-gate-stamp {
      font-family: var(--codeFont);
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--gray);
    }

    .access-gate-title {
      font-family: var(--headerFont);
      font-size: 1.4rem;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--secondary);
    }

    .access-gate-desc {
      font-size: 0.85rem;
      color: var(--darkgray);
      line-height: 1.6;
      margin: 0;
    }

    .access-gate-field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .access-gate-label {
      font-family: var(--codeFont);
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      color: var(--gray);
    }

    .access-gate-input {
      font-family: var(--codeFont);
      font-size: 1.2rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      background: transparent;
      border: 1px solid var(--lightgray);
      color: var(--dark);
      padding: 0.6rem 0.8rem;
      width: 100%;
      outline: none;
      transition: border-color 0.15s;

      &:focus { border-color: var(--secondary); }
      &::placeholder { color: var(--gray); letter-spacing: 0.1em; }
    }

    .access-gate-error {
      font-family: var(--codeFont);
      font-size: 0.7rem;
      color: #8a3a2a;
      letter-spacing: 0.06em;
    }

    .access-gate-btn {
      font-family: var(--codeFont);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: transparent;
      border: 1px solid var(--secondary);
      color: var(--secondary);
      padding: 0.7rem 1rem;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;

      &:hover {
        background: var(--secondary);
        color: var(--light);
      }
    }

    .access-gate-footer {
      font-family: var(--codeFont);
      font-size: 0.6rem;
      color: var(--gray);
      letter-spacing: 0.06em;
      margin-top: 0.5rem;
      border-top: 1px solid var(--lightgray);
      padding-top: 0.8rem;
    }

    .access-denied-block {
      border: 1px solid var(--lightgray);
      padding: 2rem;
      margin: 2rem 0;
    }

    .access-denied-stamp {
      font-family: var(--codeFont);
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--gray);
      margin-bottom: 0.5rem;
    }

    .access-denied-code {
      font-family: var(--headerFont);
      font-size: 1.2rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a3a2a;
      margin-bottom: 1rem;
    }

    .access-denied-msg {
      color: var(--darkgray);
      font-size: 0.9rem;
      line-height: 1.7;
      margin-bottom: 1rem;
    }

    .access-denied-footer {
      font-family: var(--codeFont);
      font-size: 0.65rem;
      color: var(--gray);
      letter-spacing: 0.06em;
    }

    /* Sidebar and index card filtering moved to custom.scss */
  `

  return AccessGate
}) satisfies QuartzComponentConstructor
