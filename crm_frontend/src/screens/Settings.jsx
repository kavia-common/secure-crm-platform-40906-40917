import React from "react";
import { Drawer } from "../components/overlays/Overlays";
import { Button } from "../components/primitives/Button";

/**
 * PUBLIC_INTERFACE
 * Settings with Drawer to adjust simple preferences (demo).
 */
export default function Settings() {
  const [open, setOpen] = React.useState(false);
  const firstFieldRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <p>RBAC and preferences.</p>
      <Button onClick={() => setOpen(true)}>Open Preferences</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Preferences">
        <label htmlFor="timezone">Timezone</label>
        <select id="timezone" ref={firstFieldRef} defaultValue="UTC" aria-label="Timezone">
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Europe/London">Europe/London</option>
        </select>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </div>
      </Drawer>
    </section>
  );
}
