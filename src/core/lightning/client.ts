import { authenticatedLndGrpc, getWalletInfo } from "lightning";

export const { lnd } = authenticatedLndGrpc({
  cert: process.env.LND_CERT!,
  macaroon: process.env.LND_MACAROON!,
  socket: process.env.LND_SOCKET!,
});

export const testLndConnection = async () => {
  try {
    const info = await getWalletInfo({ lnd });
    console.log("Conectado a:", info.alias);
    console.log("Pubkey:", info.public_key);
    console.log("Sincronizado:", info.is_synced_to_chain);
    console.log("Canales activos:", info.active_channels_count);
  } catch (err) {
    console.error("Error de conexión:", err);
  }
};