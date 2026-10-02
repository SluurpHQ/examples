import { signal } from "sluurp/reactive";
import { mount } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { Dialog } from "sluurp/kit/dialog.js";
import { DropdownMenu } from "./ui/dropdown-menu.tsx";

const open = signal(false);
const chosen = signal("Nothing chosen");

mount("#app", () => (
  <main class="p-6">
    <Button onClick={() => open.set(true)}>Open the dialog</Button>
    <Dialog open={open} title="Share" description="The dialog is Sluurp's; the menu in it is this app's copy.">
      <div class="flex items-center justify-between gap-2 pt-2">
        <DropdownMenu
          trigger={<Button variant="outline">Who can see it</Button>}
          items={[
            { label: "Everyone", onSelect: () => chosen.set("Everyone") },
            { label: "Only me", onSelect: () => chosen.set("Only me") },
          ]}
        />
        <output>{chosen}</output>
      </div>
    </Dialog>
  </main>
));
