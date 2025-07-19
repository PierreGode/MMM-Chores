# MMM-Chores Wiki

This page collects tips and instructions for running the **MMM-Chores** module and its admin portal. Use it as a troubleshooting reference for common issues such as reading logs, locating the admin UI and resolving port or network problems.

## Reading Logs

MMM-Chores uses MagicMirror’s built in `logger` module. Log messages are printed to the main MagicMirror log output.

- If MagicMirror is started with `npm start`, open the terminal running MagicMirror to see log entries.
- For installations managed by `pm2` you can run `pm2 logs mm` (or the name you chose for MagicMirror) to tail the log file.
- Node helper logs use the prefix `MMM-Chores` and include messages about tasks, data loading and server status.

## Accessing the Admin Portal

1. **Default address**: `http://<mirror-ip>:5003/`
   - `5003` is the default port defined by `config.adminPort` in `config.js`.
2. **HTTPS**: If you created certificates in `certs/server.key` and `certs/server.crt`, HTTPS is available on `https://<mirror-ip>:5004/` (port `adminPort + 1`).
3. **Raspberry Pi**: Open a browser on another device on the same network and visit the address above. Make sure the Pi and your device share the same Wi‑Fi or wired network.
4. **Running on a PC**: Use the IP of that computer instead of the Pi.
5. **Docker container**: Expose the admin port when starting the container, e.g. `docker run -p 5003:5003 ...`. Then browse to `http://<host-ip>:5003/`.

> **Caution**: The admin portal is intended for local network access only. Avoid exposing the port directly to the internet.

## Changing the Admin Port

Set `adminPort` in the module configuration inside `config/config.js`:

```js
{
  module: "MMM-Chores",
  position: "bottom_right",
  config: {
    adminPort: 5003 // change this number if you want a different port
  }
},
```

After editing `config.js`, restart MagicMirror for the change to take effect. The HTTPS port will automatically become `adminPort + 1`.

## Resolving Port Issues

If the admin portal does not start or shows an address already in use message:

1. Make sure no other service is using the port. On Linux you can run `sudo lsof -i :5003` to check.
2. If another program occupies the port, either stop that program or change `adminPort` in your configuration to a free port.
3. When running in Docker, confirm the container’s port mapping (`-p host:container`) matches your chosen `adminPort`.

## Finding the MagicMirror IP Address

Use one of the following methods on the device running MagicMirror:

- Run `hostname -I` in a terminal to list IP addresses.
- If using a Raspberry Pi with a desktop environment, open the network icon to view the current IP.
- On a Docker host, check the host machine’s IP. Containers typically use the host IP for external access when ports are forwarded.

## Determining the Admin Portal IP

The admin portal listens on `0.0.0.0`, which means it is reachable on any IP of the host device. Once you know the device’s IP address from the previous section, open `http://<that-ip>:<adminPort>/` in your browser.

## Resolving IP Issues

- Confirm both the client device and the MagicMirror machine are on the same local network.
- Firewalls can block connections. Ensure that the chosen port is allowed through the firewall or temporarily disable the firewall for testing.
- When running in Docker, verify that the container’s network mode and port mappings allow access from the host network.

## Related Files and Paths

- **Logs**: Displayed in the MagicMirror console or via `pm2 logs` if you use pm2.
- **Admin portal static files**: `public/admin.html`, `public/admin.js` and `public/admin.css`.
- **Server code**: `node_helper.js` launches the Express server on the configured port.
- **Data storage**: `data.json` holds tasks and people. It is created automatically on first install.

Use this wiki as a quick reference whenever you need to administer your chores system or troubleshoot connectivity problems.

