import React from "react";
import { Drawer } from "../components/overlays/Overlays";
import { Button } from "../components/primitives/Button";

/**
 * PUBLIC_INTERFACE
 * Settings with Drawer to adjust simple preferences (demo).
 */
export default function Settings() {
  const [open, setOpen] = React.useState(false);
  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <p>RBAC and preferences.</p>
      <Button onClick={() => setOpen(true)}>Open Preferences</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Preferences">
        <p>Example preference panel to demonstrate Drawer component.</p>
      </Drawer>
    </section>
  );
}
