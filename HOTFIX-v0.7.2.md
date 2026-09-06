# v0.7.2 relay hotfix

This hotfix fixes the HOST/JOIN window remaining on **CONNECTING...** indefinitely when the cloud relay cannot establish a Socket.IO connection.

Changes:

- waits for an actual Socket.IO connection before sending HOST/JOIN events
- gives a clear connection error after 45 seconds instead of buffering forever
- starts with HTTP polling and upgrades to WebSocket for better reverse-proxy compatibility
- normalizes relay URLs and removes trailing slashes/quotes
- writes the production relay environment file as UTF-8 without BOM
- enables CORS on the relay health endpoint
- adds `/health`
- adds **TEST RELAY** in the HOST/JOIN dialog
- displays the relay URL actually embedded in the build

## Quick manual relay test

Open these in a normal browser, replacing the hostname with yours:

1. `https://YOUR-RELAY.onrender.com/`
   - expected: JSON with `status: "ok"`

2. `https://YOUR-RELAY.onrender.com/socket.io/?EIO=4&transport=polling`
   - expected: a response beginning with `0{` and containing a `sid`

If #1 works but #2 does not, the deployed service is not serving Socket.IO correctly.

After changing the relay or installing this hotfix, rebuild the installer so `VITE_RELAY_URL` is embedded in the frontend.
