import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";

const urlParams = new URLSearchParams(window.location.search);
const networkParam = urlParams.get("network") || "mainnet";

let appNetwork = bitcoin.networks.bitcoin;
let mempoolApiUrl = "https://mempool.space/api";
if (networkParam === "testnet") {
    appNetwork = bitcoin.networks.testnet;
    mempoolApiUrl = "https://mempool.space/testnet4/api";
} else if (networkParam === "signet") {
    appNetwork = bitcoin.networks.testnet; 
    mempoolApiUrl = "https://mempool.space/signet/api";
}

const ECPair = ECPairFactory(ecc);

const tg = window.Telegram?.WebApp;
const isTelegramEnv = tg && tg.initData !== "";

const envIndicator = document.getElementById("env-indicator");
if (isTelegramEnv) {
  tg.expand();
  envIndicator.textContent = "Running in Telegram MiniApp 🔵";
} else {
  envIndicator.textContent = "Running in Browser (Standalone) 🌐";
}

const elPsbtHex = document.getElementById("psbt-hex");
const elEncryptedWif = document.getElementById("encrypted-wif");
const elPassword = document.getElementById("password");
const btnPreview = document.getElementById("btn-preview");
const previewSection = document.getElementById("preview-section");
const txDetails = document.getElementById("tx-details");
const btnSignBroadcast = document.getElementById("btn-sign-broadcast");
const statusMessage = document.getElementById("status-message");
const btnSignOnly = document.getElementById("btn-sign-only");
const signedHexSection = document.getElementById("signed-hex-section");
const signedTxHex = document.getElementById("signed-tx-hex");

let currentPsbt = null;
let currentDecryptedWif = null;
let isTxSigned = false;
let finalTxHex = "";

if (urlParams.has("psbt")) elPsbtHex.value = urlParams.get("psbt");

const hexToBytes = (hex) =>
  new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

async function decryptWIF(encryptedString, password) {
  const parts = encryptedString.split(":");
  if (parts.length !== 4) throw new Error("Invalid encrypted WIF format");

  const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);
  const ciphertext = hexToBytes(encryptedHex);

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const key = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const payload = new Uint8Array(ciphertext.length + authTag.length);
  payload.set(ciphertext);
  payload.set(authTag, ciphertext.length);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      payload,
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    throw new Error("Incorrect password or corrupted data");
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove("hidden");

  if (isTelegramEnv) {
    tg.HapticFeedback.notificationOccurred(
      type === "error" ? "error" : "success",
    );
  }
}

btnPreview.addEventListener("click", async () => {
  statusMessage.classList.add("hidden");
  previewSection.classList.add("hidden");

  isTxSigned = false;
  finalTxHex = "";
  signedHexSection.classList.add("hidden");
  signedTxHex.value = "";
  btnSignOnly.disabled = false;
  btnSignOnly.classList.remove("hidden");
  btnSignBroadcast.disabled = false;
  btnSignBroadcast.classList.remove("hidden");
  btnSignBroadcast.textContent = "Sign and Broadcast";
  try {
    if (!elPsbtHex.value || !elEncryptedWif.value || !elPassword.value) {
      throw new Error("Please fill in all fields.");
    }

    currentDecryptedWif = await decryptWIF(
      elEncryptedWif.value.trim(),
      elPassword.value,
    );
    currentPsbt = bitcoin.Psbt.fromHex(elPsbtHex.value.trim(), {
      network: appNetwork,
    });

    let html = `
    <div class="tx-summary">
        <div class="tx-stat">
            <span class="tx-stat-label">📥 Inputs</span>
            <span class="tx-stat-value">${currentPsbt.txInputs.length}</span>
        </div>
        <div class="tx-stat">
            <span class="tx-stat-label">📤 Outputs</span>
            <span class="tx-stat-value">${currentPsbt.txOutputs.length}</span>
        </div>
    </div>
    <h3 class="tx-subtitle">Destination Details</h3>
    <div class="tx-outputs-list">
`;

    currentPsbt.txOutputs.forEach((out, i) => {
      const btcAmount = (Number(out.value) / 100000000).toFixed(8);
      html += `
        <div class="tx-output-item">
            <div class="tx-output-header">
                <span class="tx-output-index">Output #${i}</span>
                <span class="tx-output-amount"><strong>${btcAmount}</strong> <small>BTC</small></span>
            </div>
            <div class="tx-output-address">${out.address || "Unknown Script"}</div>
        </div>
    `;
    });

    html += `</div>`;
    txDetails.innerHTML = html;
    txDetails.className = "";
    previewSection.classList.remove("hidden");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

btnSignOnly.addEventListener("click", () => {
  try {
    if (!isTxSigned) {
      const keypair = ECPair.fromWIF(currentDecryptedWif, appNetwork);
      currentPsbt.signAllInputs(keypair);
      currentPsbt.finalizeAllInputs();
      finalTxHex = currentPsbt.extractTransaction().toHex();
      isTxSigned = true;
    }
    
    signedTxHex.value = finalTxHex;
    signedHexSection.classList.remove("hidden");
    showStatus("Transaction signed successfully. You can copy the Hex.", "success");
    
    btnSignOnly.disabled = true;
  } catch (error) {
    showStatus(`Error signing: ${error.message}`, "error");
  }
});

btnSignBroadcast.addEventListener("click", async () => {
  try {
    btnSignBroadcast.disabled = true;
    btnSignBroadcast.textContent = "Broadcasting...";

    if (!isTxSigned) {
      const keypair = ECPair.fromWIF(currentDecryptedWif, appNetwork);
      currentPsbt.signAllInputs(keypair);
      currentPsbt.finalizeAllInputs();
      finalTxHex = currentPsbt.extractTransaction().toHex();
      isTxSigned = true;
    }

    signedTxHex.value = finalTxHex;
    signedHexSection.classList.remove("hidden");

    const res = await fetch(`${mempoolApiUrl}/tx`, {
      method: "POST",
      body: finalTxHex,
    });
    if (!res.ok) throw new Error(await res.text());

    showStatus(`Success! TXID:\n${await res.text()}`, "success");
    btnSignBroadcast.classList.add("hidden");
    btnSignOnly.classList.add("hidden");
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
    btnSignBroadcast.disabled = false;
    btnSignBroadcast.textContent = "Sign and Broadcast";
  }
});